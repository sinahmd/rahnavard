import os

from django.conf import settings
from rest_framework import serializers

from apps.core.image_variants import variants_payload_for_url as _variants_for_url
from apps.core.validators import ImageValidator
from .models import Article


class ArticleListSerializer(serializers.ModelSerializer):
    """Serializer for article list view."""

    # Phase 4A, additive: None until the variant set exists on disk.
    cover_image_variants = serializers.SerializerMethodField()

    def get_cover_image_variants(self, obj):
        return _variants_for_url(obj.cover_image.url if obj.cover_image else None)

    class Meta:
        model = Article
        fields = [
            "id",
            "title",
            "slug",
            "excerpt",
            "cover_image",
            "cover_image_variants",
            "published_at",
            "created_at",
        ]


class ArticleDetailSerializer(serializers.ModelSerializer):
    """Serializer for article detail view."""

    cover_image_variants = serializers.SerializerMethodField()

    def get_cover_image_variants(self, obj):
        return _variants_for_url(obj.cover_image.url if obj.cover_image else None)

    class Meta:
        model = Article
        fields = [
            "id",
            "title",
            "slug",
            "excerpt",
            "content",
            "cover_image",
            "cover_image_variants",
            "is_published",
            "published_at",
            "seo_title",
            "seo_description",
            "og_image",
            "created_at",
            "updated_at",
        ]


class ArticleAdminSerializer(serializers.ModelSerializer):
    """Serializer for admin article management."""

    slug = serializers.SlugField(required=False, allow_blank=True)

    class Meta:
        model = Article
        fields = [
            "id",
            "title",
            "slug",
            "excerpt",
            "content",
            "cover_image",
            "is_published",
            "published_at",
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
            "cover_image": {"validators": [ImageValidator()]},
            "og_image": {"validators": [ImageValidator()]},
        }
