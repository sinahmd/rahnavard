import os
from django.conf import settings
from django.core.files.base import ContentFile
from rest_framework import serializers

from apps.core.validators import ImageValidator
from .models import Car


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

    def save_gallery_files(self, instance, request_data, existing_urls=None):
        """Process gallery files from request data and save them."""
        gallery_urls = list(existing_urls or [])
        gallery_dir = os.path.join(settings.MEDIA_ROOT, 'cars', 'gallery')
        os.makedirs(gallery_dir, exist_ok=True)

        # Find all gallery file uploads (gallery_0, gallery_1, ...)
        # New files are named with a counter that CONTINUES past the existing
        # gallery, so an edit-append never reuses (and overwrites) the disk
        # file of an already-listed image: 2 existing → new files are
        # `{slug}_gallery_2.png`, `{slug}_gallery_3.png`, ...
        file_index = len(gallery_urls)
        idx = 0
        while True:
            file_key = f'gallery_{idx}'
            if file_key not in request_data:
                break
            uploaded_file = request_data[file_key]
            if hasattr(uploaded_file, 'read'):
                # It's a file — save it
                ext = os.path.splitext(uploaded_file.name)[1]
                filename = f'{instance.slug}_gallery_{file_index}{ext}'
                filepath = os.path.join(gallery_dir, filename)
                with open(filepath, 'wb+') as dest:
                    for chunk in uploaded_file.chunks():
                        dest.write(chunk)
                gallery_urls.append(f'{settings.MEDIA_URL}cars/gallery/{filename}')
                file_index += 1
            idx += 1

        return gallery_urls


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
        }

    def create(self, validated_data):
        gallery_urls = validated_data.pop('gallery', [])
        instance = super().create(validated_data)
        # Save gallery files if any were uploaded
        request = self.context.get('request')
        if request:
            # request._request is the raw Django WSGIRequest with FILES
            raw_request = getattr(request, '_request', request)
            new_urls = GalleryField().save_gallery_files(
                instance, raw_request.FILES, gallery_urls
            )
            if new_urls:
                instance.gallery = new_urls
                instance.save(update_fields=['gallery'])
        return instance

    def update(self, instance, validated_data):
        gallery_data = validated_data.pop('gallery', None)
        instance = super().update(instance, validated_data)
        request = self.context.get('request')
        if request:
            existing = list(instance.gallery or [])
            raw_request = getattr(request, '_request', request)
            new_urls = GalleryField().save_gallery_files(
                instance, raw_request.FILES, existing
            )
            if gallery_data is not None:
                # Replace gallery with new URLs from the request
                instance.gallery = new_urls if new_urls else gallery_data
            else:
                instance.gallery = new_urls
            instance.save(update_fields=['gallery'])
        return instance
