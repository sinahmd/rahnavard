"""Phase 4A image-variant pipeline tests.

Covers the module contract (`apps.core.image_variants`), the post-save
pipeline (`apps.core.variant_pipeline`), the management command, and the
additive serializer exposure — the full matrix plan §8 Phase 4A asks for:
generation, sizes, LQIP, original preservation, invalid input, partial
failure cleanup, regeneration idempotency, backward compatibility.
"""

import base64
import contextlib
import io
import os
import stat
from pathlib import Path
from unittest import mock

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.db import connections
from PIL import Image

from apps.core.image_variants import (
    VARIANT_SPECS,
    generate_variants,
    is_variant_artifact,
    lqip_data_url,
    source_has_variants,
    variant_dir_for,
)

MEDIA_URL = "/media/"


@contextlib.contextmanager
def _execute_on_commit():
    """Run transaction.on_commit callbacks queued during the block.

    `django.test.TestCase.captureOnCommitCallbacks` is the documented tool,
    but the pytest-django transactional fixtures used here sit outside that
    TestCase machinery — firing the queued callbacks manually is equivalent.
    """
    connection = connections["default"]
    original_run = connection.run_on_commit
    connection.run_on_commit = []
    try:
        yield
    finally:
        queued, connection.run_on_commit = connection.run_on_commit, original_run
        # Django 4.2 entries are (sids, func, robust) — func is index 1.
        for entry in queued:
            entry[1]()


def _png(width=1600, height=1200, color=(200, 30, 30)):
    """A valid PNG of the given size as bytes."""
    image = Image.new("RGB", (width, height), color)
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()


def _store(media_root, relative, payload):
    """Write payload under MEDIA_ROOT and return the absolute path."""
    path = Path(media_root) / relative
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(payload)
    return str(path)


@pytest.fixture
def media_root(settings, tmp_path):
    """Redirect MEDIA_ROOT to a per-test temp dir."""
    root = tmp_path / "media"
    root.mkdir()
    settings.MEDIA_ROOT = str(root)
    return root


@pytest.fixture
def source_png(media_root):
    """A 1600x1200 original at media/cars/orig.png; returns its path."""
    return _store(media_root, "cars/orig.png", _png())


# --- Core module ------------------------------------------------------------


@pytest.mark.django_db
class TestGenerateVariants:
    def test_generates_complete_set_with_correct_sizes(self, source_png):
        generate_variants(source_png)

        directory = Path(variant_dir_for(source_png))
        names = {p.name for p in directory.iterdir()}
        assert names == {"webp.webp", "sm.webp", "md.webp", "lg.webp", "lqip.webp"}

        # Dimension contract: the 4:3 source fills each box exactly.
        with Image.open(directory / "sm.webp") as thumb:
            assert thumb.size == (400, 300)
        with Image.open(directory / "md.webp") as thumb:
            assert thumb.size == (800, 600)
        with Image.open(directory / "lg.webp") as thumb:
            assert thumb.size == (1600, 1200)
        with Image.open(directory / "webp.webp") as webp:
            assert webp.size == (1600, 1200)  # original dimensions, WebP bytes
            assert webp.format == "WEBP"
        with Image.open(directory / "lqip.webp") as lqip:
            assert lqip.size[0] == 10  # 10px wide, aspect preserved
            assert lqip.format == "WEBP"

    def test_variant_sets_are_never_exposed_on_the_api(self, source_png):
        # The VariantSet URLs are the API surface; the `_paths` bookkeeping is
        # private. Pin that nothing path-shaped leaks into the public dict.
        result = generate_variants(source_png)
        assert set(result.as_dict()) == {"webp", "sm", "md", "lg", "lqip"}
        for value in result.as_dict().values():
            assert value.startswith(MEDIA_URL) or value.startswith("data:image/")

    def test_urls_are_media_url_prefixed_and_posix(self, source_png):
        result = generate_variants(source_png)
        d = result.as_dict()
        for key in ("webp", "sm", "md", "lg", "lqip"):
            assert d[key].startswith(MEDIA_URL)
            assert "\\" not in d[key]
        assert d["sm"] == f"{MEDIA_URL}cars/.variants/orig/sm.webp"

    def test_original_is_preserved_byte_for_byte(self, source_png):
        original_bytes = Path(source_png).read_bytes()
        generate_variants(source_png)
        assert Path(source_png).read_bytes() == original_bytes

    def test_portrait_source_gets_aspect_preserving_thumbs(self, media_root):
        portrait = _store(media_root, "cars/portrait.png", _png(600, 800))
        generate_variants(portrait)
        with Image.open(Path(variant_dir_for(portrait)) / "sm.webp") as thumb:
            # thumbnail() fits INSIDE the 400x300 box without upscaling or
            # cropping: a 2:3 portrait becomes 225x300, aspect preserved.
            assert thumb.size == (225, 300)
            assert thumb.size[0] <= 400 and thumb.size[1] <= 300

    def test_lqip_data_url_roundtrip(self, source_png):
        result = generate_variants(source_png)
        data_url = lqip_data_url(result)
        assert data_url.startswith("data:image/webp;base64,")
        payload = base64.b64decode(data_url.split(",", 1)[1])
        with Image.open(io.BytesIO(payload)) as img:
            assert img.size[0] == 10

    def test_all_or_nothing_on_encode_failure(self, media_root):
        garbage = _store(media_root, "cars/broken.png", b"not an image")
        with pytest.raises(Exception):
            generate_variants(garbage)
        assert not Path(variant_dir_for(garbage)).exists()

    def test_preexisting_set_survives_a_failed_regen(self, source_png):
        first = generate_variants(source_png)
        before = {
            p.name: p.stat().st_mtime_ns
            for p in Path(variant_dir_for(source_png)).iterdir()
        }

        with mock.patch(
            "apps.core.image_variants.Image.open", side_effect=OSError("disk")
        ):
            with pytest.raises(OSError):
                generate_variants(source_png)

        after = {
            p.name: p.stat().st_mtime_ns
            for p in Path(variant_dir_for(source_png)).iterdir()
        }
        assert after == before  # untouched
        assert source_has_variants(source_png)
        assert lqip_data_url(first) is not None

    def test_regenerating_produces_identical_paths(self, source_png):
        first = generate_variants(source_png)
        second = generate_variants(source_png)
        assert first.as_dict() == second.as_dict()
        names = {p.name for p in Path(variant_dir_for(source_png)).iterdir()}
        assert len(names) == 5  # replaced in place, not duplicated

    def test_source_has_variants_requires_complete_set(self, source_png):
        assert not source_has_variants(source_png)
        generate_variants(source_png)
        assert source_has_variants(source_png)
        (Path(variant_dir_for(source_png)) / "md.webp").unlink()
        assert not source_has_variants(source_png)  # partial set counts as none

    def test_is_variant_artifact(self, source_png):
        assert is_variant_artifact(
            os.path.join("media", "cars", ".variants", "x", "sm.webp")
        )
        assert not is_variant_artifact(os.path.join("media", "cars", "x.png"))

    def test_non_rgb_source_is_converted(self, media_root):
        # P-mode (palette) PNGs are the classic non-RGB non-alpha case; the
        # pipeline must normalize them (to RGBA now) without erroring.
        image = Image.new("P", (400, 300))
        buffer = io.BytesIO()
        image.save(buffer, format="PNG")
        path = _store(media_root, "cars/palette.png", buffer.getvalue())
        generate_variants(path)
        with Image.open(Path(variant_dir_for(path)) / "sm.webp") as thumb:
            assert thumb.size == (400, 300)  # 4:3 landscape fills the box exactly

    def test_transparent_source_keeps_alpha(self, media_root):
        # Remove-bg cutouts are RGBA PNGs; the WebP variants must carry the
        # alpha channel instead of flattening it onto black. Regression pin
        # for the production incident: 403→chmod exposed variants whose
        # transparent backgrounds had been composited black.
        image = Image.new("RGBA", (400, 300), (10, 200, 10, 0))
        buffer = io.BytesIO()
        image.save(buffer, format="PNG")
        path = _store(media_root, "cars/cutout.png", buffer.getvalue())
        generate_variants(path)
        for name in ("sm.webp", "webp.webp"):
            with Image.open(Path(variant_dir_for(path)) / name) as out:
                assert out.mode == "RGBA"
                alpha = out.getchannel("A")
                # A fully transparent source must stay fully transparent —
                # the alpha histogram must contain 0, never just 255 (the
                # flatten-to-black signature).
                assert alpha.getextrema()[0] == 0

    def test_variant_files_are_world_readable(self, source_png):
        # `tempfile.mkstemp` creates 0600 and `os.replace` preserves that
        # mode; nginx's unprivileged worker then 403s. Every generated file
        # must land at 0644 like Django FileField uploads do.
        generate_variants(source_png)
        directory = Path(variant_dir_for(source_png))
        for name in ("webp.webp", "sm.webp", "md.webp", "lg.webp", "lqip.webp"):
            mode = stat.S_IMODE(os.stat(directory / name).st_mode)
            assert mode == 0o644, f"{name} has mode {oct(mode)}"

    def test_missing_source_raises_file_not_found(self, media_root):
        ghost = str(Path(media_root) / "cars" / "ghost.png")
        with pytest.raises(FileNotFoundError):
            generate_variants(ghost)

    def test_mid_write_failure_cleans_created_files(self, source_png):
        # Replace succeeds for the first file, then the filesystem dies on
        # the second: everything created by THIS call must be removed.
        real_replace = os.replace
        calls = {"n": 0}

        def flaky_replace(src, dst):
            calls["n"] += 1
            if calls["n"] == 2:
                raise OSError("disk died mid-batch")
            return real_replace(src, dst)

        with mock.patch("apps.core.image_variants.os.replace", side_effect=flaky_replace):
            with pytest.raises(OSError):
                generate_variants(source_png)

        # At most the first file could have survived — but the cleanup pass
        # must have removed it. Empty/partial directory is acceptable only if
        # no complete-looking file set remains.
        remaining = sorted(p.name for p in Path(variant_dir_for(source_png)).iterdir())
        assert remaining == []


class TestMediaUrlToPathGuards:
    """`_media_url_to_path` is fed by DB-stored URLs on every public read —
    a hostile gallery entry must never resolve to a path outside MEDIA_ROOT."""

    def _resolve(self, url):
        from apps.core.image_variants import _media_url_to_path

        return _media_url_to_path(url)

    def test_traversal_and_absolute_entries_are_rejected(self, media_root):
        import os

        inside = self._resolve(f"{MEDIA_URL}cars/x.png")
        assert inside == os.path.join(str(media_root), "cars", "x.png")
        assert self._resolve(None) is None
        assert self._resolve("") is None
        assert self._resolve(42) is None
        assert self._resolve(f"{MEDIA_URL}../secret.txt") is None
        assert self._resolve(f"{MEDIA_URL}cars/../..//etc/passwd") is None
        assert self._resolve("/etc/passwd") is None


# --- post-save pipeline -----------------------------------------------------


def _create_car(slug, payload=None):
    from apps.cars.models import Car

    return Car.objects.create(
        brand="Toyota",
        model="RAV4",
        persian_name="تویوتا راو۴",
        slug=slug,
        year=2025,
        fuel_type="gasoline",
        transmission="automatic",
        main_image=SimpleUploadedFile(
            f"{slug}.png", payload if payload is not None else _png(), "image/png"
        ),
    )


@pytest.mark.django_db
class TestSavePipeline:
    def test_variants_generated_after_commit(self, media_root):
        with _execute_on_commit():
            car = _create_car("pipeline-car")
        source = str(Path(media_root) / car.main_image.name)
        assert source_has_variants(source)

    def test_resave_without_new_upload_skips_regeneration(self, media_root):
        with _execute_on_commit():
            car = _create_car("resave-car")
        source = str(Path(media_root) / car.main_image.name)
        before = {
            p.name: p.stat().st_mtime_ns
            for p in Path(variant_dir_for(source)).iterdir()
        }

        with _execute_on_commit():
            car.description = "touched"
            car.save()

        after = {
            p.name: p.stat().st_mtime_ns
            for p in Path(variant_dir_for(source)).iterdir()
        }
        assert before == after  # complete set → skipped

    def test_empty_field_or_missing_file_is_a_noop(self, media_root):
        from apps.core.variant_pipeline import generate_for_field

        from apps.cars.models import Car

        bare = Car.objects.create(
            brand="Toyota",
            model="RAV4",
            persian_name="تویوتا راو۴",
            slug="noop-car",
            year=2025,
            fuel_type="gasoline",
            transmission="automatic",
        )
        assert generate_for_field(bare, "main_image") is None  # no image at all

        named = Car(main_image="cars/ghost.png")
        assert generate_for_field(named, "main_image") is None  # file missing

    def test_generation_failure_is_contained(self, media_root):
        # Simulate a contained failure: disk dies during generation. The row
        # must still commit (on_commit callbacks must not propagate).
        with mock.patch(
            "apps.core.variant_pipeline.generate_variants",
            side_effect=OSError("disk full"),
        ):
            with _execute_on_commit():
                car = _create_car("failure-car")

        source = str(Path(media_root) / car.main_image.name)
        assert os.path.isfile(source)  # original present
        assert not source_has_variants(source)  # variants absent: pre-4A state
        # ...and the regen command repairs exactly this gap.
        from django.core.management import call_command

        call_command("regenerate_image_variants", "--apply")
        assert source_has_variants(source)


@pytest.mark.django_db
class TestGalleryVariantPipeline:
    """Gallery files bypass ImageField/signals, so the variant hook is called
    from the serializer — the upload path must still produce variants."""

    def _payload(self, slug):
        from django.core.files.uploadedfile import SimpleUploadedFile

        return {
            "brand": "Toyota",
            "model": "RAV4",
            "persian_name": "تویوتا راو۴",
            "slug": slug,
            "year": 2025,
            "fuel_type": "gasoline",
            "transmission": "automatic",
            "is_active": True,
            "main_image": SimpleUploadedFile("main.png", _png(), "image/png"),
            "gallery_0": SimpleUploadedFile("g0.png", _png(), "image/png"),
            "gallery_1": SimpleUploadedFile("g1.png", _png(), "image/png"),
        }

    def test_gallery_upload_generates_variants_after_commit(
        self, admin_client, media_root
    ):
        from apps.cars.models import Car

        with _execute_on_commit():
            response = admin_client.post(
                "/api/v1/admin/cars/", self._payload("gallery-variants"), format="multipart"
            )

        assert response.status_code == 201, response.data
        car = Car.objects.get(slug="gallery-variants")
        assert len(car.gallery) == 2
        for url in car.gallery:
            relative = url[len(MEDIA_URL):]
            assert source_has_variants(str(Path(media_root) / relative)), url

        detail = admin_client.get(f"/api/v1/cars/{car.slug}/")
        assert detail.status_code == 200
        variants = detail.data["gallery_variants"]
        assert len(variants) == 2
        assert variants[0]["sm"] == (
            f"{MEDIA_URL}cars/{car.pk}/gallery/.variants/"
            f"{Path(car.gallery[0]).stem}/sm.webp"
        )


# --- Management command -----------------------------------------------------


@pytest.mark.django_db
class TestRegenerateCommand:
    def _run(self, *args):
        from django.core.management import call_command

        out = io.StringIO()
        call_command("regenerate_image_variants", *args, stdout=out)
        return out.getvalue()

    def test_dry_run_default_never_writes(self, media_root):
        car = _create_car("dry-car")
        out = self._run()
        assert "DRY RUN" in out
        assert not source_has_variants(str(Path(media_root) / car.main_image.name))

    def test_gallery_urls_are_backfilled(self, media_root):
        from apps.cars.models import Car

        car = _create_car("gallery-regen-car")
        relative = f"cars/{car.pk}/gallery/{'b' * 32}.png"
        _store(media_root, relative, _png())
        car.gallery = [f"{MEDIA_URL}{relative}"]
        car.save(update_fields=["gallery"])

        self._run("--apply")
        assert source_has_variants(str(Path(media_root) / relative))

    def test_apply_backfills_gap(self, media_root):
        car = _create_car("gap-car")
        self._run("--apply")
        assert source_has_variants(str(Path(media_root) / car.main_image.name))

    def test_idempotent_and_gap_filling(self, media_root):
        a = _create_car("car-a")
        self._run("--apply")
        b = _create_car("car-b")  # partially generated state
        out = self._run("--apply")
        assert "already complete" in out
        assert source_has_variants(str(Path(media_root) / a.main_image.name))
        assert source_has_variants(str(Path(media_root) / b.main_image.name))

    def test_unreadable_image_does_not_block_others(self, media_root):
        from django.core.management import call_command

        good = _create_car("good-car")
        bad = _create_car("bad-car", payload=b"garbage")

        out = self._run("--apply")
        # UNREADABLE lines go to stderr; the stdout summary counts them.
        assert "unreadable: 1" in out
        assert source_has_variants(str(Path(media_root) / good.main_image.name))
        assert not source_has_variants(str(Path(media_root) / bad.main_image.name))

        # --strict surfaces the unreadable image as a nonzero exit.
        from django.core.management.base import CommandError

        with pytest.raises(CommandError):
            call_command("regenerate_image_variants", "--apply", "--strict")

    def test_rows_without_a_local_file_are_counted_missing(self, media_root):
        from apps.cars.models import Car

        Car.objects.create(
            brand="Toyota",
            model="RAV4",
            persian_name="تویوتا راو۴",
            slug="no-file-car",
            year=2025,
            fuel_type="gasoline",
            transmission="automatic",
            main_image="cars/ghost.png",  # name stored, file never existed
        )
        out = self._run("--apply")
        assert "missing file: 1" in out

        # A hero slide without an image hits the same branch via SOURCES.
        from apps.core.models import HeroSlide

        HeroSlide.objects.create(image="", alt_text="بدون تصویر")
        out = self._run("--apply")
        assert "missing file: 2" in out


# --- Serializer backward compatibility --------------------------------------


@pytest.mark.django_db
class TestSerializerCompatibility:
    def test_public_list_shape_additive_only(self, media_root):
        from rest_framework.test import APIClient

        car = _create_car("api-list-car")

        response = APIClient().get("/api/v1/cars/")
        assert response.status_code == 200
        row = next(r for r in response.data["results"] if r["id"] == car.id)
        # Old shape fully intact; new field present but None (no variants yet).
        for key in ("main_image", "brand", "persian_name", "price"):
            assert key in row
        assert row["main_image_variants"] is None

        generate_variants(str(Path(media_root) / car.main_image.name))
        response = APIClient().get("/api/v1/cars/")
        row = next(r for r in response.data["results"] if r["id"] == car.id)
        variants = row["main_image_variants"]
        assert variants is not None
        assert variants["sm"].startswith(MEDIA_URL)
        assert variants["blur"].startswith("data:image/webp;base64,")

    def test_public_detail_gallery_variants_align_with_gallery(self, media_root):
        from rest_framework.test import APIClient

        car = _create_car("api-detail-car")
        # Point the gallery at a stored file and give it variants.
        source = str(Path(media_root) / car.main_image.name)
        car.gallery = [f"{MEDIA_URL}cars/{Path(source).name}"]
        car.save(update_fields=["gallery"])
        generate_variants(source)

        response = APIClient().get(f"/api/v1/cars/{car.slug}/")
        assert response.status_code == 200
        data = response.data
        assert len(data["gallery_variants"]) == len(data["gallery"]) == 1
        assert data["gallery_variants"][0]["md"] == (
            f"{MEDIA_URL}cars/.variants/{Path(source).stem}/md.webp"
        )
        # Old fields unchanged.
        assert data["gallery"] == [f"{MEDIA_URL}cars/{Path(source).name}"]
        assert isinstance(data["main_image"], str)

    def test_article_list_additive_only(self, media_root):
        from rest_framework.test import APIClient

        from apps.articles.models import Article

        article = Article.objects.create(
            title="تست",
            slug="variant-article",
            content="متن",
            is_published=True,
            cover_image=SimpleUploadedFile("cover.png", _png(), "image/png"),
        )
        response = APIClient().get("/api/v1/articles/")
        assert response.status_code == 200
        row = next(
            r for r in response.data["results"] if r["slug"] == "variant-article"
        )
        assert row["cover_image_variants"] is None

        with _execute_on_commit():
            article.save()
        response = APIClient().get("/api/v1/articles/")
        row = next(
            r for r in response.data["results"] if r["slug"] == "variant-article"
        )
        assert row["cover_image_variants"]["sm"].startswith(MEDIA_URL)
