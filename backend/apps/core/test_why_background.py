"""SiteSettings.why_background — one managed section background.

Verifies the minimal integration of the singleton field with the existing
Phase 4A pipeline: admin multipart upload → variants generated after commit,
additive serializer exposure on both endpoints, the content-image validation
profile, the regen command source, and the orphan-cleanup classification.
Everything exercised here is the generic pipeline — there is no Why-specific
machinery (plan scratch doc: WHY_RAHNAVARD_BACKGROUND_PLAN.md).
"""

import io
from pathlib import Path
from urllib.parse import urlparse

import pytest
from django.core.files.base import ContentFile
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from PIL import Image

from apps.core.image_variants import source_has_variants
from apps.core.models import SiteSettings

from .test_image_variants import _execute_on_commit, _png


@pytest.fixture
def media_root(settings, tmp_path):
    """Redirect MEDIA_ROOT to a per-test temp dir."""
    root = tmp_path / "media"
    root.mkdir()
    settings.MEDIA_ROOT = str(root)
    return root


def _patch_background(admin_client, name="bg.png", **png_kwargs):
    payload = {
        "why_background": SimpleUploadedFile(name, _png(**png_kwargs), "image/png")
    }
    return admin_client.patch("/api/v1/admin/settings/", payload, format="multipart")


@pytest.mark.django_db
class TestWhyBackgroundAdminUpload:
    def test_multipart_patch_sets_field_and_generates_variants(
        self, admin_client, media_root
    ):
        with _execute_on_commit():
            response = _patch_background(admin_client)

        assert response.status_code == 200, getattr(response, "data", response.content)
        site = SiteSettings.load()
        assert site.why_background.name.startswith("why/")
        assert source_has_variants(str(Path(media_root) / site.why_background.name))

    def test_undersized_image_is_rejected_with_field_error(self, admin_client):
        # Content-image profile: the section background must be a real
        # photo-sized asset (min 800×600), unlike branding assets.
        response = _patch_background(admin_client, width=400, height=300)

        assert response.status_code == 400
        assert "why_background" in response.data


@pytest.mark.django_db
class TestWhyBackgroundSerializerExposure:
    def test_public_endpoint_exposes_field_and_variants(self, admin_client):
        with _execute_on_commit():
            _patch_background(admin_client)

        response = admin_client.get("/api/v1/settings/")
        assert response.status_code == 200
        data = response.json()
        # DRF builds FileField URLs against the request host; the path is
        # what matters here (the RSC layer strips the origin).
        assert urlparse(data["why_background"]).path.startswith("/media/why/")
        variants = data["why_background_variants"]
        assert variants is not None
        assert variants["lg"].endswith(".webp")
        assert variants["blur"].startswith("data:image/webp;base64,")

    def test_variants_are_null_until_generated(self, api_client, media_root):
        # A file placed without the on-commit hook firing (e.g. pre-pipeline
        # data) must degrade: original URL exposed, variants null.
        site = SiteSettings.load()
        # NOTE: ImageFieldFile.save() resolves the name against upload_to,
        # so a bare filename lands at why/<name> (never pass "why/..." here).
        site.why_background.save("direct.png", ContentFile(_png()), save=True)

        response = api_client.get("/api/v1/settings/")
        assert response.status_code == 200
        data = response.json()
        assert urlparse(data["why_background"]).path == "/media/why/direct.png"
        assert data["why_background_variants"] is None


@pytest.mark.django_db
class TestWhyBackgroundMaintenanceCommands:
    def test_regen_command_covers_why_background(self, media_root):
        site = SiteSettings.load()
        site.why_background.save("why/regen.png", ContentFile(_png()), save=True)
        source = str(Path(media_root) / site.why_background.name)
        assert not source_has_variants(source)

        call_command("regenerate_image_variants", "--apply")

        assert source_has_variants(source)

    def test_replacement_orphan_is_classified(self, media_root):
        """The canonical FileField case, now for the singleton: replacing the
        background leaves the old file on disk, and cleanup classifies it."""
        site = SiteSettings.load()
        site.why_background.save("old.png", ContentFile(_png()), save=True)
        old_path = Path(media_root) / "why" / "old.png"
        site.why_background.save("new.png", ContentFile(_png()), save=True)

        assert old_path.is_file()  # FileField never removed it

        buffer = io.StringIO()
        call_command("cleanup_orphan_media", stdout=buffer)
        assert "why/old.png" in buffer.getvalue()
