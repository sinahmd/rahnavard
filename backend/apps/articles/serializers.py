from rest_framework import serializers

from apps.core.validators import ImageValidator
from .models import Article


class ArticleListSerializer(serializers.ModelSerializer):
    """Serializer for article list view."""

    class Meta:
        model = Article
        fields = [
            "id",
            "title",
            "slug",
            "excerpt",
            "cover_image",
            "published_at",
            "created_at",
        ]


class ArticleDetailSerializer(serializers.ModelSerializer):
    """Serializer for article detail view."""

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
            "seo_title",
            "seo_description",
            "og_image",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]
        extra_kwargs = {
            "cover_image": {"validators": [ImageValidator()]},
            "og_image": {"validators": [ImageValidator()]},
        }
