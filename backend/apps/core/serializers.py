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
            # Branding asset, not a content image: a wordmark is legitimately
            # wide and short, so the content-image floor (800x600) rejects the
            # site's own shipped logo (assets/logo.png, 727x340). Keep a floor
            # that rejects unusably small files, but not the photo profile.
            # Every other check (size/extension/MIME/magic bytes/max dims)
            # stays identical to the default profile.
            "logo": {"validators": [ImageValidator(min_width=200, min_height=60)]},
            "default_og_image": {"validators": [ImageValidator()]},
        }


class HeroSlideSerializer(serializers.ModelSerializer):
    class Meta:
        model = HeroSlide
        fields = ["id", "title", "image", "alt_text", "link", "is_active", "display_order"]
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
