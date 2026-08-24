from rest_framework import serializers

from apps.core.validators import ImageValidator
from .models import HeroSlide, Redirect, SiteSettings, WhyFeature


class SiteSettingsSerializer(serializers.ModelSerializer):
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
            "logo": {"validators": [ImageValidator()]},
            "default_og_image": {"validators": [ImageValidator()]},
        }


class HeroSlideSerializer(serializers.ModelSerializer):
    class Meta:
        model = HeroSlide
        fields = ["id", "title", "image", "alt_text", "is_active", "display_order"]
        extra_kwargs = {
            "image": {"validators": [ImageValidator()]},
        }


class WhyFeatureSerializer(serializers.ModelSerializer):
    class Meta:
        model = WhyFeature
        fields = ["id", "title", "description", "icon", "is_active", "display_order"]
        extra_kwargs = {
            "icon": {"validators": [ImageValidator()]},
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
