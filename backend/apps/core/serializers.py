import os

from django.conf import settings
from rest_framework import serializers

from apps.core.image_variants import variants_payload_for_url as _variants_for_url
from apps.core.validators import ImageValidator
from .models import HeroSlide, Redirect, SiteSettings, WhyFeature


class SiteSettingsSerializer(serializers.ModelSerializer):
    # Additive (Phase 4A mechanics): None until the variant set exists on disk.
    why_background_variants = serializers.SerializerMethodField()

    def get_why_background_variants(self, obj):
        return _variants_for_url(obj.why_background.url if obj.why_background else None)

    class Meta:
        model = SiteSettings
        fields = [
            "site_name",
            "site_description",
            "logo",
            "phone",
            "address",
            "instagram",
            "telegram",
            "whatsapp",
            "hero_cta_primary_text",
            "hero_cta_primary_link",
            "hero_cta_secondary_text",
            "hero_cta_secondary_link",
            "why_title",
            "why_description",
            "why_background",
            "why_background_variants",
            "cars_section_title",
            "cars_section_description",
            "articles_section_title",
            "articles_section_description",
            "branches_section_title",
            "form_title",
            "form_description",
            "footer_description",
            "footer_copyright",
            "default_og_image",
        ]
        extra_kwargs = {
            # Branding asset, not a content image: a wordmark is legitimately
            # wide and short, so the content-image floor (800x600) rejects the
            # site's own shipped logo (assets/logo.png, 727x340). Keep a floor
            # that rejects unusably small files, but not the photo profile.
            # Every other check (size/extension/MIME/magic bytes/max dims)
            # stays identical to the default profile.
            "logo": {"validators": [ImageValidator(min_width=200, min_height=60)]},
            "default_og_image": {"validators": [ImageValidator()]},
            # Section background is a real content photograph — the full
            # content-image profile (min 800×600), not a branding profile.
            "why_background": {"validators": [ImageValidator()]},
        }


class HeroSlideSerializer(serializers.ModelSerializer):
    # Phase 4A, additive: None until the variant set exists on disk.
    image_variants = serializers.SerializerMethodField()

    def get_image_variants(self, obj):
        return _variants_for_url(obj.image.url if obj.image else None)

    class Meta:
        model = HeroSlide
        fields = [
            "id",
            "title",
            "image",
            "image_variants",
            "alt_text",
            "link",
            "is_active",
            "display_order",
        ]
        extra_kwargs = {
            "image": {"validators": [ImageValidator()]},
        }


class WhyFeatureSerializer(serializers.ModelSerializer):
    class Meta:
        model = WhyFeature
        fields = ["id", "title", "description", "icon", "is_active", "display_order"]
        extra_kwargs = {
            # Icons are legitimately small — skip dimension validation.
            "icon": {"validators": [ImageValidator(check_dimensions=False)]},
        }


class RedirectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Redirect
        fields = [
            "id",
            "old_path",
            "new_path",
            "status_code",
            "is_active",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]
