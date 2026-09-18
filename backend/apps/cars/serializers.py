import os
import shutil
import tempfile
import uuid

from django.conf import settings
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.files.base import ContentFile
from django.db import transaction
from rest_framework import serializers

from apps.core.validators import ImageValidator, PDFValidator
from .models import Car


# Gallery files are the one image path that never passes through an
# `ImageField`, so the Phase 1 content checks (size, extension, MIME, magic
# bytes, dimensions) are applied explicitly instead of via `extra_kwargs`.
_GALLERY_IMAGE_VALIDATOR = ImageValidator()


# Gallery files live at MEDIA_ROOT/<this>/<uuid><ext>, derived from the car's
# primary key rather than its slug: a slug rename then neither moves nor
# invalidates a file, and a recreated car can never collide with a deleted
# one. Rationale: docs/adr/0007-uuid-gallery-storage.md.
def _gallery_relative_dir(car_id):
    """Identity-derived gallery directory, POSIX and relative to MEDIA_URL."""
    return f'cars/{car_id}/gallery'


def _gallery_filesystem_dir(car_id):
    """The same directory resolved on the local filesystem."""
    return os.path.join(settings.MEDIA_ROOT, *_gallery_relative_dir(car_id).split('/'))


def _remove_files(paths):
    """Best-effort removal of files this upload created — never pre-existing ones."""
    for path in paths:
        try:
            os.remove(path)
        except OSError:
            pass


class GalleryWrite:
    """Outcome of a gallery upload: the new URL list plus the files it created.

    The created paths are tracked explicitly because `transaction.atomic()`
    rolls back the DATABASE and never the filesystem: when the database write
    that follows the move fails, or the transaction rolls back afterwards, the
    caller must be able to delete exactly the files this upload moved into
    place — and nothing else.
    """

    def __init__(self, urls, created_paths=None):
        self.urls = urls
        self.created_paths = list(created_paths or [])

    def cleanup(self):
        _remove_files(self.created_paths)


class GalleryField(serializers.Field):
    """Custom field that handles gallery image uploads.

    Accepts multiple files via FormData (gallery_0, gallery_1, ...)
    and stores them as a list of URLs in the JSONField.
    Also accepts a JSON string of existing URLs to preserve.
    """

    def to_representation(self, value):
        return value or []

    def to_internal_value(self, data):
        # If it's already a list (from JSON), return as-is
        if isinstance(data, list):
            return data
        return []

    @staticmethod
    def _validate_upload(uploaded):
        """Apply the shared image validator, reporting failures as a 400.

        `ImageValidator` raises Django's `ValidationError`, which DRF does not
        translate into a response — converting it keeps a spoofed or undersized
        gallery file a field error rather than a 500.
        """
        try:
            _GALLERY_IMAGE_VALIDATOR(uploaded)
        except DjangoValidationError as exc:
            raise serializers.ValidationError({'gallery': exc.messages})

    @staticmethod
    def uploaded_files(request_data):
        """The `gallery_0..N` uploads in order, stopping at the first gap.

        Mirrors the wire contract (`frontend/lib/api/formData.ts` appends
        `gallery_0..N` for a `File[]`) and the previous loop's behavior: a gap
        ends the scan instead of skipping ahead.
        """
        uploads = []
        index = 0
        while True:
            uploaded = request_data.get(f'gallery_{index}')
            if uploaded is None:
                return uploads
            if hasattr(uploaded, 'read'):
                uploads.append(uploaded)
            index += 1

    def save_gallery_files(self, instance, request_data, existing_urls=None):
        """Store uploaded gallery files and return a `GalleryWrite`.

        Two-phase write. Each upload is streamed into a staging directory
        created INSIDE MEDIA_ROOT — the same filesystem as the destination, so
        the final move is an atomic rename rather than a cross-device copy —
        and only then moved to its immutable path. Any failure removes the
        staged files, the files already moved into place and the staging
        directory before re-raising, so a failed upload leaves no orphan
        behind.

        The caller owns the database half: it must `GalleryWrite.cleanup()` if
        the gallery field cannot be persisted.
        """
        gallery_urls = list(existing_urls or [])
        uploads = self.uploaded_files(request_data)
        if not uploads:
            return GalleryWrite(gallery_urls)

        relative_dir = _gallery_relative_dir(instance.pk)
        final_dir = _gallery_filesystem_dir(instance.pk)
        # `tempfile.mkdtemp()`'s default (/tmp) is a different mount inside the
        # container, which would silently downgrade the move to a non-atomic
        # copy — hence an explicit, dot-prefixed staging root in MEDIA_ROOT.
        staging_dir = tempfile.mkdtemp(prefix='.gallery-upload-', dir=settings.MEDIA_ROOT)
        created = []
        try:
            staged = []
            for uploaded in uploads:
                self._validate_upload(uploaded)
                ext = os.path.splitext(uploaded.name)[1].lower()
                filename = f'{uuid.uuid4().hex}{ext}'
                with open(os.path.join(staging_dir, filename), 'wb+') as destination:
                    for chunk in uploaded.chunks():
                        destination.write(chunk)
                staged.append(filename)

            os.makedirs(final_dir, exist_ok=True)
            for filename in staged:
                destination = os.path.join(final_dir, filename)
                shutil.move(os.path.join(staging_dir, filename), destination)
                created.append(destination)
                gallery_urls.append(f'{settings.MEDIA_URL}{relative_dir}/{filename}')

            return GalleryWrite(gallery_urls, created)
        except Exception:
            _remove_files(created)
            raise
        finally:
            shutil.rmtree(staging_dir, ignore_errors=True)


class CarListSerializer(serializers.ModelSerializer):
    """Serializer for car list view."""

    main_image = serializers.ImageField(read_only=True)
    fuel_type_display = serializers.CharField(
        source="get_fuel_type_display", read_only=True
    )
    transmission_display = serializers.CharField(
        source="get_transmission_display", read_only=True
    )

    class Meta:
        model = Car
        fields = [
            "id",
            "brand",
            "model",
            "persian_name",
            "slug",
            "year",
            "fuel_type",
            "fuel_type_display",
            "transmission",
            "transmission_display",
            "price",
            "body_type",
            "engine",
            "main_image",
            "is_featured",
            "display_order",
            "created_at",
        ]


class CarDetailSerializer(serializers.ModelSerializer):
    """Serializer for car detail view."""

    fuel_type_display = serializers.CharField(
        source="get_fuel_type_display", read_only=True
    )
    transmission_display = serializers.CharField(
        source="get_transmission_display", read_only=True
    )

    class Meta:
        model = Car
        fields = [
            "id",
            "brand",
            "model",
            "persian_name",
            "slug",
            "description",
            "year",
            "fuel_type",
            "fuel_type_display",
            "transmission",
            "transmission_display",
            "engine",
            "price",
            "main_image",
            "gallery",
            "manufacturer",
            "body_type",
            "color",
            "technical_description",
            "catalog_file",
            "is_active",
            "is_featured",
            "seo_title",
            "seo_description",
            "og_image",
            "created_at",
            "updated_at",
        ]


class CarAdminSerializer(serializers.ModelSerializer):
    """Serializer for admin car management."""

    slug = serializers.SlugField(required=False, allow_blank=True)
    gallery = GalleryField(required=False)

    class Meta:
        model = Car
        fields = [
            "id",
            "brand",
            "model",
            "persian_name",
            "slug",
            "description",
            "year",
            "fuel_type",
            "transmission",
            "engine",
            "price",
            "main_image",
            "gallery",
            "manufacturer",
            "body_type",
            "color",
            "technical_description",
            "catalog_file",
            "is_active",
            "is_featured",
            "display_order",
            "is_deleted",
            "deleted_at",
            "seo_title",
            "seo_description",
            "og_image",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["is_deleted", "deleted_at", "created_at", "updated_at"]
        extra_kwargs = {
            "main_image": {"validators": [ImageValidator()]},
            "og_image": {"validators": [ImageValidator()]},
            "catalog_file": {"validators": [PDFValidator()]},
        }

    def create(self, validated_data):
        gallery_urls = validated_data.pop('gallery', [])
        raw_request = self._raw_request()
        # Gallery paths derive from the primary key, so the model row must be
        # written first; both halves of the operation then share one
        # transaction (the filesystem half cleans up after itself).
        with transaction.atomic():
            instance = super().create(validated_data)
            if raw_request is not None:
                write = GalleryField().save_gallery_files(
                    instance, raw_request.FILES, gallery_urls
                )
                self._commit_gallery(instance, write)
        return instance

    def update(self, instance, validated_data):
        gallery_data = validated_data.pop('gallery', None)
        raw_request = self._raw_request()
        with transaction.atomic():
            instance = super().update(instance, validated_data)
            if raw_request is not None:
                existing = list(instance.gallery or [])
                write = GalleryField().save_gallery_files(
                    instance, raw_request.FILES, existing
                )
                if gallery_data is not None and not write.urls:
                    # Unchanged contract: an explicit JSON gallery list only
                    # applies when there is nothing to append to.
                    write.urls = gallery_data
                self._commit_gallery(instance, write)
        return instance

    def _raw_request(self):
        """The raw Django WSGIRequest (only it carries `.FILES`, not the DRF one)."""
        request = self.context.get('request')
        return getattr(request, '_request', request) if request else None

    @staticmethod
    def _commit_gallery(instance, write):
        """Persist the gallery URL list, deleting this upload's files on failure.

        The filesystem is not rolled back by the enclosing transaction, so a
        failed `save()` must undo the move explicitly — including when an
        exception later in the transaction rolls the row back.
        """
        if write.urls == (instance.gallery or []):
            # Nothing to store (e.g. a form save without new files): keep the
            # previous code's behavior of not issuing a pointless UPDATE.
            return
        instance.gallery = write.urls
        try:
            instance.save(update_fields=['gallery'])
        except Exception:
            write.cleanup()
            raise
