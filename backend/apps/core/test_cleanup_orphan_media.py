"""Phase 5 cleanup_orphan_media command tests.

Covers the orphan classes the command exists for (plan §4, §8 Phase 5):

- referenced files (including soft-deleted rows and the singleton settings)
  are never reported;
- FileField replacement orphans (the case `test_gallery_storage.py`
  explicitly defers to this command);
- gallery JSONField URLs;
- Phase 4A variant artifacts — both the dead-original set and the
  crash-mid-write dot-tmp file next to a live original (ADR-0009);
- Phase 3 `.gallery-upload-*` staging leftovers (§7.2 Case E);
- unknown dotfiles are left alone;
- dry-run is the default and deletes nothing; --delete is idempotent;
- emptied directories are pruned non-recursively.
"""

import io
from pathlib import Path

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from django.core.management.base import CommandError
from PIL import Image

from apps.cars.models import Car
from apps.core.models import HeroSlide, SiteSettings

MEDIA_URL = "/media/"


def _png():
    buffer = io.BytesIO()
    Image.new("RGB", (400, 300), (10, 120, 200)).save(buffer, format="PNG")
    return buffer.getvalue()


def _write(media_root, relative, payload):
    """Create a file under MEDIA_ROOT (directories as needed)."""
    path = Path(media_root) / relative
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(payload if isinstance(payload, bytes) else payload.encode())
    return path


def _upload(relative_name, payload):
    """An unsaved SimpleUploadedFile Django will place at `relative_name`."""
    return SimpleUploadedFile(name=relative_name, content=payload, content_type="image/png")


def _run(*args):
    """call_command with a captured stdout; returns the output text."""
    buffer = io.StringIO()
    call_command("cleanup_orphan_media", *args, stdout=buffer)
    return buffer.getvalue()


@pytest.fixture
def media_root(settings, tmp_path):
    root = tmp_path / "media"
    root.mkdir()
    settings.MEDIA_ROOT = str(root)
    settings.MEDIA_URL = MEDIA_URL
    return root


def _store_car(**overrides):
    """A Car whose main_image lands at media/cars/<name>."""
    name = overrides.pop("image_name", "car.png")
    return Car.objects.create(
        brand="Toyota",
        model="RAV4",
        persian_name="تویوتا راو۴",
        slug=overrides.pop("slug", "rav4"),
        year=2025,
        fuel_type="gasoline",
        transmission="automatic",
        main_image=_upload(f"cars/{name}", _png()),
        **overrides,
    )


# --- Nothing to do -----------------------------------------------------------


@pytest.mark.django_db
class TestCleanLibrary:
    def test_fully_referenced_library_reports_nothing(self, media_root):
        # Assigning an uploaded file writes it through the storage, so both
        # files exist on disk exactly where their fields point.
        _store_car()
        HeroSlide.objects.create(
            title="اسلاید", alt_text="تصویر", image=_upload("hero/slide.png", _png())
        )

        assert "No orphan media files." in _run()

    def test_empty_media_root_is_clean(self, media_root):
        assert "No orphan media files." in _run()


# --- Plain orphans -----------------------------------------------------------


@pytest.mark.django_db
class TestPlainOrphans:
    def test_filefield_replacement_orphan_is_reported(self, media_root):
        """The canonical FileField case: old file stays, DB points at the new one."""
        _store_car(image_name="old.png")

        old_path = _write(media_root, "cars/old.png", _png())
        car = Car.objects.get(slug="rav4")
        car.main_image.save("new.png", SimpleUploadedFile("new.png", _png()), save=True)

        assert old_path.is_file()  # FileField never removed it

        assert "cars/old.png" in _run()

    def test_soft_deleted_rows_keep_their_files_referenced(self, media_root):
        car = _store_car()
        car.delete()  # soft delete

        assert "No orphan media files." in _run()

    def test_staging_leftover_is_an_orphan_but_referenced_gallery_is_not(self, media_root):
        car = _store_car()
        _write(media_root, "cars/<uuid>/gallery/1.png", _png())
        car.gallery = [f"{MEDIA_URL}cars/<uuid>/gallery/1.png"]
        car.save()

        _write(media_root, ".gallery-upload-abc123/upload.png", _png())

        out = _run()
        assert ".gallery-upload-abc123/upload.png" in out
        assert "cars/<uuid>/gallery/1.png" not in out

    def test_unknown_dotfiles_are_ignored(self, media_root):
        _write(media_root, ".hidden/still-here.png", _png())
        _write(media_root, ".DS_Store", _png())

        assert "No orphan media files." in _run()


# --- Variant artifacts (ADR-0009) ---------------------------------------------


@pytest.mark.django_db
class TestVariantArtifacts:
    def test_variants_of_a_live_original_are_kept_but_tmp_leftovers_go(self, media_root):
        _store_car(image_name="live.png")
        for name in ("sm.webp", "md.webp", "lg.webp", "webp.webp", "lqip.webp"):
            _write(media_root, f"cars/.variants/live/{name}", _png())
        # The Phase 4A crash-mid-write artifact.
        _write(media_root, "cars/.variants/live/.sm-abc123.tmp", _png())

        out = _run()
        assert "cars/.variants/live/.sm-abc123.tmp" in out
        assert "cars/.variants/live/sm.webp" not in out

    def test_whole_variant_set_of_a_dead_original_is_an_orphan(self, media_root):
        # No Car references it: the original was replaced and never cleaned.
        _write(media_root, "cars/dead.png", _png())
        for name in ("sm.webp", "md.webp", "lqip.webp"):
            _write(media_root, f"cars/.variants/dead/{name}", _png())

        out = _run()
        assert "cars/.variants/dead/sm.webp" in out
        assert "cars/.variants/dead/lqip.webp" in out

    def test_variant_set_with_a_missing_original_is_an_orphan(self, media_root):
        # Original deleted out-of-band; variants remain (cleanable).
        for name in ("sm.webp", "lqip.webp"):
            _write(media_root, "hero/.variants/gone/" + name, _png())

        assert "hero/.variants/gone/sm.webp" in _run()


# --- Dry run / delete ----------------------------------------------------------


@pytest.mark.django_db
class TestDeleteSemantics:
    def test_dry_run_reports_and_deletes_nothing(self, media_root):
        _write(media_root, "cars/orphan.png", _png())

        out = _run()
        assert "cars/orphan.png" in out
        assert "dry run" in out
        assert (Path(media_root) / "cars/orphan.png").is_file()

    def test_delete_removes_orphans_and_keeps_referenced(self, media_root):
        _store_car()
        _write(media_root, "cars/orphan.png", _png())
        _write(media_root, ".gallery-upload-x/u.png", _png())

        out = _run("--delete")
        assert "Deleted 2 orphan file(s)" in out
        assert not (Path(media_root) / "cars/orphan.png").exists()
        assert not (Path(media_root) / ".gallery-upload-x/u.png").exists()
        # The referenced original (written by the storage on save) survives.
        referenced_name = Car.objects.get(slug="rav4").main_image.name
        assert (Path(media_root) / referenced_name).is_file()

    def test_delete_prunes_emptied_dirs_and_stops_at_nonempty_ones(self, media_root):
        _store_car()  # keeps cars/ non-empty: the prune cascade must stop there
        _write(media_root, "cars/.variants/dead/sm.webp", _png())
        _write(media_root, ".gallery-upload-x/u.png", _png())

        _run("--delete")
        assert not (Path(media_root) / "cars/.variants/dead").exists()
        # The emptied `.variants` directory itself is pruned (safe: the
        # variant pipeline recreates it on demand), while non-empty cars/ is not.
        assert not (Path(media_root) / "cars/.variants").exists()
        assert (Path(media_root) / "cars").is_dir()

    def test_delete_is_idempotent(self, media_root):
        _write(media_root, "cars/orphan.png", _png())
        _run("--delete")

        assert "No orphan media files." in _run()

    def test_unknown_delete_flag_is_rejected(self):
        with pytest.raises(CommandError):
            call_command("cleanup_orphan_media", "--apply")
