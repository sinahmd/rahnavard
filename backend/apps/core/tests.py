from io import BytesIO

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from django.utils import timezone
from PIL import Image
from rest_framework.test import APIClient

from apps.cars.models import Car
from .mixins import SoftDeleteManager, SoftDeleteMixin
from .models import HeroSlide, Redirect, SiteSettings, WhyFeature
from .validators import ImageValidator


@pytest.mark.parametrize("data,expected", [({}, False), ({"message": "error"}, False), ({"password": "private"}, True), ({"phone": "private"}, True), ({"token": "private"}, True), ({"secret": "private"}, True)])
def test_sentry_sensitive_data_predicate(data, expected):
    from config.settings import _contains_sensitive_data

    assert _contains_sensitive_data({"request": {"data": data}}) is expected
    assert _contains_sensitive_data({"message": "ordinary error"}) is False


def test_sentry_callback_preserves_errors_without_private_context():
    from config.settings import _sentry_before_send

    assert _sentry_before_send({"request": {"data": {"password": "private"}}}, {}) is None
    event = {
        "message": "synthetic failure",
        "request": {"data": "password=private", "headers": {"Cookie": "private"}},
        "user": {"email": "private"},
        "extra": {"phone": "private"},
        "breadcrumbs": [{"message": "private"}],
        "exception": {"values": [{"stacktrace": {"frames": [{"filename": "app.py", "vars": {"secret": "private"}}]}}]},
    }
    result = _sentry_before_send(event, {})
    assert result["message"] == "synthetic failure"
    assert "private" not in str(result)
    assert result["exception"]["values"][0]["stacktrace"]["frames"][0] == {"filename": "app.py"}


def _png_bytes(width=800, height=600):
    """Return a valid PNG image with the given dimensions."""
    img = Image.new('RGB', (width, height), 'white')
    buf = BytesIO()
    img.save(buf, format='PNG')
    return buf.getvalue()


def _jpeg_bytes(width=800, height=600):
    """Return a valid JPEG image with the given dimensions."""
    img = Image.new('RGB', (width, height), 'white')
    buf = BytesIO()
    img.save(buf, format='JPEG')
    return buf.getvalue()


# ============================================================================
# SoftDeleteMixin Tests
# ============================================================================


@pytest.mark.django_db
class TestSoftDeleteMixin:
    """Tests for SoftDeleteMixin functionality."""

    def test_soft_delete_sets_flags(self, sample_car):
        """Test that soft_delete sets is_deleted and deleted_at."""
        assert sample_car.is_deleted is False
        assert sample_car.deleted_at is None

        sample_car.soft_delete()

        sample_car.refresh_from_db()
        assert sample_car.is_deleted is True
        assert sample_car.deleted_at is not None

    def test_soft_delete_hides_from_default_manager(self, sample_car):
        """Test that soft-deleted items are hidden from default manager."""
        assert Car.objects.filter(pk=sample_car.pk).exists()

        sample_car.soft_delete()

        # Should not appear in default queryset
        assert not Car.objects.filter(pk=sample_car.pk).exists()

    def test_soft_delete_visible_in_with_deleted(self, sample_car):
        """Test that soft-deleted items appear in with_deleted()."""
        sample_car.soft_delete()

        # Should appear in with_deleted queryset
        assert Car.objects.with_deleted().filter(pk=sample_car.pk).exists()

    def test_soft_delete_only_in_deleted_only(self, sample_car):
        """Test that soft-deleted items appear in deleted_only()."""
        sample_car.soft_delete()

        # Should appear in deleted_only queryset
        assert Car.objects.deleted_only().filter(pk=sample_car.pk).exists()

    def test_restore_removes_flags(self, sample_car):
        """Test that restore clears is_deleted and deleted_at."""
        sample_car.soft_delete()
        sample_car.restore()

        sample_car.refresh_from_db()
        assert sample_car.is_deleted is False
        assert sample_car.deleted_at is None

    def test_restore_makes_visible_again(self, sample_car):
        """Test that restore makes item visible in default manager."""
        sample_car.soft_delete()
        assert not Car.objects.filter(pk=sample_car.pk).exists()

        sample_car.restore()
        assert Car.objects.filter(pk=sample_car.pk).exists()

    def test_hard_delete_removes_permanently(self, sample_car):
        """Test that hard_delete permanently removes the record."""
        pk = sample_car.pk
        sample_car.hard_delete()

        # Should not appear in any queryset
        assert not Car.objects.filter(pk=pk).exists()
        assert not Car.objects.with_deleted().filter(pk=pk).exists()

    def test_soft_delete_preserves_data(self, sample_car):
        """Test that soft delete preserves all original data."""
        original_brand = sample_car.brand
        original_model = sample_car.model

        sample_car.soft_delete()

        # Data should still be accessible via with_deleted
        retrieved = Car.objects.with_deleted().get(pk=sample_car.pk)
        assert retrieved.brand == original_brand
        assert retrieved.model == original_model

    def test_multiple_soft_deletes_are_idempotent(self, sample_car):
        """Test that calling soft_delete multiple times doesn't break."""
        sample_car.soft_delete()
        first_deleted_at = sample_car.deleted_at

        sample_car.soft_delete()
        sample_car.refresh_from_db()

        # Should still be soft deleted
        assert sample_car.is_deleted is True
        # deleted_at should be updated to the latest call
        assert sample_car.deleted_at >= first_deleted_at

    def test_restore_on_non_deleted_item(self, sample_car):
        """Test that restore on non-deleted item is safe."""
        # Should not raise any errors
        sample_car.restore()
        sample_car.refresh_from_db()

        assert sample_car.is_deleted is False
        assert sample_car.deleted_at is None

    def test_instance_delete_performs_soft_delete(self, sample_car):
        """Test that instance.delete() performs soft delete, not hard delete."""
        pk = sample_car.pk
        sample_car.delete()

        # Should still exist in database
        assert Car.objects.with_deleted().filter(pk=pk).exists()
        # Should be soft-deleted
        assert not Car.objects.filter(pk=pk).exists()

    def test_queryset_delete_performs_soft_delete(self, sample_cars):
        """Test that QuerySet.delete() performs soft delete, not hard delete."""
        pks = [c.pk for c in sample_cars]

        # Bulk soft delete via queryset
        Car.objects.filter(pk__in=pks[:2]).delete()

        # All should still exist in database
        for pk in pks:
            assert Car.objects.with_deleted().filter(pk=pk).exists()

        # First 2 should be soft-deleted
        for pk in pks[:2]:
            assert not Car.objects.filter(pk=pk).exists()

        # Last 3 should still be active
        for pk in pks[2:]:
            assert Car.objects.filter(pk=pk).exists()


# ============================================================================
# SoftDeleteManager Tests
# ============================================================================


@pytest.mark.django_db
class TestSoftDeleteManager:
    """Tests for SoftDeleteManager."""

    def test_get_queryset_excludes_deleted(self, sample_cars):
        """Test that get_queryset excludes soft-deleted items."""
        # Soft delete one car
        sample_cars[0].soft_delete()

        # Default manager should exclude it
        assert Car.objects.count() == len(sample_cars) - 1

    def test_with_deleted_includes_all(self, sample_cars):
        """Test that with_deleted includes all items."""
        sample_cars[0].soft_delete()

        # with_deleted should include all
        assert Car.objects.with_deleted().count() == len(sample_cars)

    def test_deleted_only_returns_only_deleted(self, sample_cars):
        """Test that deleted_only returns only soft-deleted items."""
        sample_cars[0].soft_delete()
        sample_cars[1].soft_delete()

        # deleted_only should return only deleted items
        assert Car.objects.deleted_only().count() == 2
        assert set(Car.objects.deleted_only()) == {sample_cars[0], sample_cars[1]}


# ============================================================================
# SoftDelete with Filtering Tests
# ============================================================================


@pytest.mark.django_db
class TestSoftDeleteWithFiltering:
    """Tests for soft delete combined with filtering."""

    def test_filter_active_excludes_deleted(self, sample_cars):
        """Test that filtering active items excludes soft-deleted."""
        # Soft delete an active car
        active_car = next(c for c in sample_cars if c.is_active)
        active_car.soft_delete()

        # Active cars should exclude the soft-deleted one
        active_cars = Car.objects.filter(is_active=True)
        assert active_car not in active_cars

    def test_filter_by_brand_excludes_deleted(self, sample_cars):
        """Test that filtering by brand excludes soft-deleted."""
        # Soft delete a car
        sample_cars[0].soft_delete()

        # Filter by brand should not include soft-deleted
        brand_cars = Car.objects.filter(brand=sample_cars[0].brand)
        assert sample_cars[0] not in brand_cars

    def test_search_excludes_deleted(self, sample_cars):
        """Test that search excludes soft-deleted items."""
        # Soft delete a car
        sample_cars[0].soft_delete()

        # Search should not find soft-deleted car
        from django.db.models import Q
        search_results = Car.objects.filter(
            Q(brand__icontains=sample_cars[0].brand) |
            Q(model__icontains=sample_cars[0].model)
        )
        assert sample_cars[0] not in search_results


# ============================================================================
# Existing Core Model Tests
# ============================================================================


@pytest.mark.django_db
class TestSiteSettings:
    """Tests for SiteSettings model."""

    def test_load_creates_default(self):
        """Test that load() creates default settings if none exist."""
        settings = SiteSettings.load()
        assert settings.pk == 1
        assert settings.site_name == 'راهنورد خودرو'

    def test_load_returns_existing(self):
        """Test that load() returns existing settings."""
        SiteSettings.objects.create(pk=1, site_name='Test Site')
        settings = SiteSettings.load()
        assert settings.site_name == 'Test Site'

    def test_save_enforces_singleton(self):
        """Test that save() always uses pk=1."""
        settings = SiteSettings(site_name='Test')
        settings.save()
        assert settings.pk == 1

    def test_str_representation(self):
        """Test string representation."""
        settings = SiteSettings.load()
        assert str(settings) == 'راهنورد خودرو'

    def test_delete_raises_error(self):
        """Test that deleting SiteSettings raises ValueError."""
        settings = SiteSettings.load()
        import pytest
        with pytest.raises(ValueError, match="Cannot delete SiteSettings singleton"):
            settings.delete()

    def test_delete_does_not_remove_from_database(self):
        """Test that failed delete doesn't remove the record."""
        settings = SiteSettings.load()
        try:
            settings.delete()
        except ValueError:
            pass
        # Settings should still exist
        assert SiteSettings.objects.filter(pk=1).exists()


@pytest.mark.django_db
class TestHeroSlide:
    """Tests for HeroSlide model."""

    def test_create_slide(self):
        """Test creating a hero slide."""
        slide = HeroSlide.objects.create(
            title='Test Slide',
            alt_text='Test alt text',
            is_active=True,
            display_order=1
        )
        assert slide.title == 'Test Slide'
        assert slide.is_active is True

    def test_str_with_title(self):
        """Test string representation with title."""
        slide = HeroSlide.objects.create(title='Test Slide', alt_text='Test')
        assert str(slide) == 'Test Slide'

    def test_str_without_title(self):
        """Test string representation without title."""
        slide = HeroSlide.objects.create(alt_text='Test')
        assert 'اسلاید' in str(slide)

    def test_ordering(self):
        """Test ordering by display_order."""
        HeroSlide.objects.create(alt_text='Second', display_order=2)
        HeroSlide.objects.create(alt_text='First', display_order=1)
        slides = list(HeroSlide.objects.all())
        assert slides[0].display_order == 1
        assert slides[1].display_order == 2


@pytest.mark.django_db
class TestWhyFeature:
    """Tests for WhyFeature model."""

    def test_create_feature(self):
        """Test creating a why feature."""
        feature = WhyFeature.objects.create(
            title='Expertise',
            description='Years of experience',
            is_active=True,
            display_order=1
        )
        assert feature.title == 'Expertise'

    def test_str_representation(self):
        """Test string representation."""
        feature = WhyFeature.objects.create(title='Test', description='Desc')
        assert str(feature) == 'Test'


@pytest.mark.django_db
class TestRedirect:
    """Tests for Redirect model."""

    def test_create_redirect(self):
        """Test creating a redirect."""
        redirect = Redirect.objects.create(
            old_path='/old-path',
            new_path='/new-path',
            status_code=301
        )
        assert redirect.old_path == '/old-path'
        assert redirect.status_code == 301

    def test_str_representation(self):
        """Test string representation."""
        redirect = Redirect.objects.create(
            old_path='/old',
            new_path='/new'
        )
        assert '/old' in str(redirect)
        assert '/new' in str(redirect)


@pytest.mark.django_db
class TestSiteSettingsAPI:
    """Tests for SiteSettings API endpoint."""

    def test_get_settings(self, api_client):
        """Test retrieving site settings."""
        response = api_client.get('/api/v1/settings/')
        assert response.status_code == 200
        assert 'site_name' in response.data

    def test_settings_returns_defaults(self, api_client):
        """Test that settings return default values."""
        response = api_client.get('/api/v1/settings/')
        assert response.data['site_name'] == 'راهنورد خودرو'


@pytest.mark.django_db
class TestHeroSlideAPI:
    """Tests for HeroSlide API endpoint."""

    def test_get_active_slides(self, api_client):
        """Test retrieving active hero slides."""
        HeroSlide.objects.create(alt_text='Active', is_active=True, display_order=1)
        HeroSlide.objects.create(alt_text='Inactive', is_active=False, display_order=2)
        response = api_client.get('/api/v1/hero-slides/')
        assert response.status_code == 200
        assert len(response.data['results']) == 1

    def test_empty_slides(self, api_client):
        """Test when no slides exist."""
        response = api_client.get('/api/v1/hero-slides/')
        assert response.status_code == 200
        assert len(response.data['results']) == 0


@pytest.mark.django_db
class TestWhyFeatureAPI:
    """Tests for WhyFeature API endpoint."""

    def test_get_active_features(self, api_client):
        """Test retrieving active why features."""
        WhyFeature.objects.create(title='Test', description='Desc', is_active=True, display_order=1)
        response = api_client.get('/api/v1/why-features/')
        assert response.status_code == 200
        assert len(response.data['results']) == 1


@pytest.mark.django_db
class TestHomepageDataAPI:
    """Tests for HomepageData API endpoint."""

    def test_get_homepage_data(self, api_client):
        """Test retrieving homepage data."""
        response = api_client.get('/api/v1/homepage/')
        assert response.status_code == 200
        assert 'settings' in response.data
        assert 'hero_slides' in response.data
        assert 'why_features' in response.data


# ============================================================================
# Upload Validator Tests (Phase 1 hardening)
# ============================================================================


@pytest.mark.django_db
class TestImageValidatorMagicBytes:
    """Extension and MIME content_type are client-controlled claims; the file
    content must match the claimed image format."""

    def test_image_validator_rejects_spoofed_mime(self):
        """PNG extension + PNG content_type wrapping JPEG bytes → rejected."""
        from django.core.exceptions import ValidationError

        from .validators import ImageValidator

        spoofed = SimpleUploadedFile(
            'photo.png', _jpeg_bytes(), content_type='image/png'
        )
        with pytest.raises(ValidationError):
            ImageValidator()(spoofed)

    def test_image_validator_accepts_matching_content(self):
        """A genuine PNG passes all checks (size/ext/magic/dimensions)."""
        from .validators import ImageValidator

        valid = SimpleUploadedFile(
            'photo.png', _png_bytes(), content_type='image/png'
        )
        ImageValidator()(valid)  # must not raise


@pytest.mark.django_db
class TestImageDimensionValidation:
    """Phase 1 hardening: min 800x600, max 4000x3000, max aspect 3:1."""

    def test_image_dimensions_validated(self):
        """Below-min, above-max and over-aspect images are rejected;
        boundary 800x600 passes; icons skip dimension checks."""
        from django.core.exceptions import ValidationError

        from .validators import ImageValidator

        def _upload(width, height, name='img.png'):
            return SimpleUploadedFile(
                name, _png_bytes(width, height), content_type='image/png'
            )

        # Below minimum → rejected
        with pytest.raises(ValidationError):
            ImageValidator()(_upload(400, 300, 'small.png'))

        # Above maximum (width 4500 > 4000) → rejected
        with pytest.raises(ValidationError):
            ImageValidator()(_upload(4500, 600, 'large.png'))

        # Aspect ratio 5:1 (within max dimensions) → rejected
        with pytest.raises(ValidationError):
            ImageValidator()(_upload(3000, 600, 'wide.png'))

        # Exact minimum boundary → accepted
        ImageValidator()(_upload(800, 600, 'boundary.png'))

        # Icons legitimately skip dimension validation
        tiny_icon = SimpleUploadedFile(
            'icon.png', _png_bytes(100, 80), content_type='image/png'
        )
        ImageValidator(check_dimensions=False)(tiny_icon)  # must not raise


@pytest.mark.django_db
class TestUploadValidatorEdgeCases:
    """Branch coverage for the upload validators (size, extension, empty and
    unreadable payloads, PDF magic bytes)."""

    def test_image_validator_rejects_oversize_file(self):
        from django.core.exceptions import ValidationError

        from .validators import ImageValidator

        big = SimpleUploadedFile('big.png', b'x' * (2 * 1024 * 1024), 'image/png')
        with pytest.raises(ValidationError):
            ImageValidator(max_size_mb=1)(big)

    def test_image_validator_rejects_disallowed_extension(self):
        from django.core.exceptions import ValidationError

        from .validators import ImageValidator

        gif = SimpleUploadedFile('anim.gif', _png_bytes(), 'image/gif')
        with pytest.raises(ValidationError):
            ImageValidator()(gif)

    def test_image_validator_rejects_empty_file(self):
        from django.core.exceptions import ValidationError

        from .validators import ImageValidator

        empty = SimpleUploadedFile('empty.png', b'', 'image/png')
        with pytest.raises(ValidationError):
            ImageValidator()(empty)

    def test_validate_dimensions_rejects_unreadable_file(self):
        from django.core.exceptions import ValidationError

        from .validators import validate_dimensions

        garbage = SimpleUploadedFile('garbage.png', b'not an image at all', 'image/png')
        with pytest.raises(ValidationError):
            validate_dimensions(garbage)

    def test_pdf_validator_accepts_real_pdf(self):
        from .validators import PDFValidator

        pdf = SimpleUploadedFile('doc.pdf', b'%PDF-1.4\n%fake-but-signed', 'application/pdf')
        PDFValidator()(pdf)  # must not raise

    def test_pdf_validator_rejects_non_pdf_extension(self):
        from django.core.exceptions import ValidationError

        from .validators import PDFValidator

        renamed = SimpleUploadedFile('doc.txt', b'%PDF-1.4\n', 'text/plain')
        with pytest.raises(ValidationError):
            PDFValidator()(renamed)

    def test_pdf_validator_rejects_missing_magic(self):
        from django.core.exceptions import ValidationError

        from .validators import PDFValidator

        fake = SimpleUploadedFile('doc.pdf', b'just text, no signature', 'application/pdf')
        with pytest.raises(ValidationError):
            PDFValidator()(fake)

    def test_pdf_validator_rejects_oversize_file(self):
        from django.core.exceptions import ValidationError

        from .validators import PDFValidator

        big = SimpleUploadedFile('doc.pdf', b'%PDF-1.4\n' + b'x' * (2 * 1024 * 1024), 'application/pdf')
        with pytest.raises(ValidationError):
            PDFValidator(max_size_mb=1)(big)


@pytest.mark.django_db
class TestValidateImageFileHelper:
    """Direct coverage of validate_image_file() and the WebP magic-byte
    branch — the multipart API path is pinned in TestAdminUploadValidation."""

    def _validate(self, name, content, content_type):
        from .validators import validate_image_file

        validate_image_file(SimpleUploadedFile(name, content, content_type))

    def test_oversize_raises_with_persian_message(self):
        from django.core.exceptions import ValidationError

        from .validators import MAX_IMAGE_SIZE_BYTES, validate_image_file

        with pytest.raises(ValidationError):
            self._validate('big.png', b'x' * (MAX_IMAGE_SIZE_BYTES + 1), 'image/png')

    def test_disallowed_extension_raises(self):
        from django.core.exceptions import ValidationError

        from .validators import validate_image_file

        with pytest.raises(ValidationError):
            self._validate('anim.gif', _png_bytes(), 'image/gif')

    def test_webp_magic_bytes_accepted(self):
        """A genuine Pillow-encoded WebP passes magic bytes + dimensions."""
        img = Image.new('RGB', (800, 600), 'white')
        buf = BytesIO()
        img.save(buf, format='WEBP')
        self._validate('pic.webp', buf.getvalue(), 'image/webp')  # must not raise

    def test_webp_wrong_signature_rejected(self):
        """RIFF container but WEBP marker not at offset 8 → rejected."""
        from django.core.exceptions import ValidationError

        from .validators import validate_image_file

        bad = b'RIFF' + b'\x00' * 4 + b'WAVE' + b'\x00' * 16
        with pytest.raises(ValidationError):
            self._validate('pic.webp', bad, 'image/webp')

    def test_short_webp_rejected(self):
        """Fewer than 12 bytes cannot carry a WebP signature → rejected."""
        from django.core.exceptions import ValidationError

        from .validators import validate_image_file

        with pytest.raises(ValidationError):
            self._validate('pic.webp', b'RIFF\x00\x01', 'image/webp')

    def test_empty_file_raises_empty_message(self):
        from django.core.exceptions import ValidationError

        from .validators import validate_image_file

        with pytest.raises(ValidationError):
            self._validate('empty.png', b'', 'image/png')


@pytest.mark.django_db
class TestImageValidatorMimeBranch:
    """The content_type branch is UNREACHABLE through DRF's ImageField:
    DRF delegates to Django's forms.ImageField, which overwrites content_type
    with the MIME Pillow detects from the bytes before validators run
    (verified: a client-declared 'image/gif' PNG reaches the validator as
    'image/png', same object). It is pinned here by calling the validator
    directly, so the branch keeps its contract and its coverage."""

    def test_validator_rejects_disallowed_content_type(self):
        from django.core.exceptions import ValidationError

        spoofed = SimpleUploadedFile('ok.png', _png_bytes(), 'image/gif')
        with pytest.raises(ValidationError):
            ImageValidator()(spoofed)

    def test_validator_accepts_allowed_content_type(self):
        ImageValidator()(
            SimpleUploadedFile('ok.png', _png_bytes(), 'image/png')
        )  # must not raise


@pytest.mark.django_db
class TestAdminUploadValidation:
    """Upload validation through the real admin multipart API path.

    The load-bearing guard on this path is the magic-byte check — a
    client-claimed MIME carries no authority because Django re-derives it
    from the content (see TestImageValidatorMimeBranch).
    """

    def _car_payload(self, slug, **extra):
        return {
            'brand': 'Toyota', 'model': 'RAV4', 'persian_name': 'تویوتا راو۴',
            'slug': slug, 'year': '2025', 'fuel_type': 'gasoline',
            'transmission': 'automatic', 'is_active': 'true',
            **extra,
        }

    def test_admin_normalizes_spoofed_mime_type(self, admin_client):
        """A PNG declared image/gif is accepted AND stored as a real PNG:
        the client's MIME claim is replaced by the content-derived type, so
        there is nothing to reject — the bytes genuinely are a valid PNG.
        (Was previously asserted as a 400; that expectation was wrong —
        Django had already normalized content_type before validation.)"""
        data = self._car_payload(
            'mime-spoof',
            main_image=SimpleUploadedFile('ok.png', _png_bytes(), 'image/gif'),
        )
        response = admin_client.post('/api/v1/admin/cars/', data, format='multipart')
        assert response.status_code == 201
        car = Car.objects.get(slug='mime-spoof')
        assert car.main_image.name.endswith('.png')
        car.main_image.delete(save=False)
        car.delete()

    def test_admin_rejects_mismatched_extension_content(self, admin_client):
        """A decodable JPEG renamed .png → magic-byte branch rejects (the
        spoof ImageValidator exists to catch)."""
        data = self._car_payload(
            'ext-spoof',
            main_image=SimpleUploadedFile('spoof.png', _jpeg_bytes(), 'image/png'),
        )
        response = admin_client.post('/api/v1/admin/cars/', data, format='multipart')
        assert response.status_code == 400
        assert 'main_image' in response.data

    def test_admin_accepts_valid_upload(self, admin_client):
        """Genuine PNG with honest content_type → 201 (control)."""
        data = self._car_payload(
            'valid-upload',
            main_image=SimpleUploadedFile('ok.png', _png_bytes(), 'image/png'),
        )
        response = admin_client.post('/api/v1/admin/cars/', data, format='multipart')
        assert response.status_code == 201
        Car.objects.get(slug='valid-upload').main_image.delete(save=False)
        Car.objects.get(slug='valid-upload').delete()

    def test_admin_rejects_oversize_main_image(self, admin_client):
        """A >5MB image (size only — bytes exceed the limit before any
        parsing) → rejected at the size branch."""
        data = self._car_payload(
            'size-spoof',
            main_image=SimpleUploadedFile('big.png', b'x' * (6 * 1024 * 1024), 'image/png'),
        )
        response = admin_client.post('/api/v1/admin/cars/', data, format='multipart')
        assert response.status_code == 400
        assert 'main_image' in response.data


# ============================================================================
# SiteSettings.logo — branding-asset dimension profile
# ============================================================================


@pytest.mark.django_db
class TestSiteSettingsLogoDimensions:
    """Regression pin: the content-image profile (min 800x600) rejects the
    site's own shipped logo (assets/logo.png, 727x340). `logo` therefore
    carries a branding profile (min 200x60) — every other check stays
    identical to the default, so this relaxes the floor, not the contract."""

    def _logo_field_and_validators(self):
        """The field + validators DRF actually mounts on SiteSettings.logo."""
        from .serializers import SiteSettingsSerializer

        field = SiteSettingsSerializer().fields['logo']
        return field, field.validators

    def _shipped_logo_upload(self):
        """The shipped branding asset's exact dimensions (assets/logo.png is
        727x340). Generated rather than read from disk: the backend image
        mounts only backend/, so the repo-root assets/ dir is not reachable
        from inside the container."""
        return SimpleUploadedFile('logo.png', _png_bytes(727, 340), 'image/png')

    def test_shipped_logo_asset_is_accepted(self):
        """The real branding asset must pass the configured validators."""
        field, validators = self._logo_field_and_validators()
        image_validators = [v for v in validators if isinstance(v, ImageValidator)]
        assert image_validators, 'SiteSettings.logo lost its ImageValidator'
        upload = self._shipped_logo_upload()
        for validator in image_validators:
            validator.set_context(field)
            validator(upload)  # must not raise

    def test_default_profile_would_reject_the_shipped_logo(self):
        """Documents WHY the branding profile exists: the default 800x600
        floor fails on a 727x340 wordmark. Stops the logo being 'simplified'
        back to a bare ImageValidator() and silently breaking uploads.

        This is the regression pin: it reproduces the defect that shipped."""
        from django.core.exceptions import ValidationError

        with pytest.raises(ValidationError):
            ImageValidator()(self._shipped_logo_upload())

    def test_undersized_logo_is_still_rejected(self):
        """The fix lowers the floor — it does not remove it."""
        from django.core.exceptions import ValidationError

        _, validators = self._logo_field_and_validators()
        tiny = SimpleUploadedFile('tiny.png', _png_bytes(100, 30), 'image/png')
        with pytest.raises(ValidationError):
            for validator in validators:
                if isinstance(validator, ImageValidator):
                    validator(tiny)

    def test_logo_profile_still_enforces_max_dimensions_and_aspect(self):
        """The branding profile only lowers the FLOOR. The ceiling (4000x3000)
        and the 3:1 aspect cap are inherited unchanged, so an oversized or
        banner-shaped upload is still rejected."""
        from django.core.exceptions import ValidationError

        _, validators = self._logo_field_and_validators()
        image_validators = [v for v in validators if isinstance(v, ImageValidator)]
        assert image_validators, 'SiteSettings.logo lost its ImageValidator'

        def _run(upload):
            for validator in image_validators:
                validator(upload)

        # 4200x1500 is 2.8:1, so it only trips the max dimension rule.
        with pytest.raises(ValidationError):
            _run(SimpleUploadedFile('huge.png', _png_bytes(4200, 1500), 'image/png'))

        # 1400x400 is within the max dimensions but 3.5:1 -> aspect cap.
        with pytest.raises(ValidationError):
            _run(SimpleUploadedFile('banner.png', _png_bytes(1400, 400), 'image/png'))

        # The shipped 727x340 wordmark is 2.1:1 and stays accepted.
        _run(self._shipped_logo_upload())

    def test_logo_still_rejects_mismatched_content(self):
        """Magic-byte enforcement is untouched by the dimension change."""
        from django.core.exceptions import ValidationError

        _, validators = self._logo_field_and_validators()
        spoofed = SimpleUploadedFile('logo.png', _jpeg_bytes(727, 340), 'image/png')
        with pytest.raises(ValidationError):
            for validator in validators:
                if isinstance(validator, ImageValidator):
                    validator(spoofed)
