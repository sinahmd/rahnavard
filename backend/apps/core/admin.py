from django.contrib import admin

from .models import HeroSlide, Redirect, SiteSettings, WhyFeature


@admin.register(SiteSettings)
class SiteSettingsAdmin(admin.ModelAdmin):
    fieldsets = (
        (
            "اطلاعات اصلی",
            {"fields": ("site_name", "site_description", "logo", "phone", "address")},
        ),
        ("شبکه‌های اجتماعی", {"fields": ("instagram", "telegram", "whatsapp")}),
        (
            "بخش هیرو",
            {
                "fields": (
                    "hero_cta_primary_text",
                    "hero_cta_primary_link",
                    "hero_cta_secondary_text",
                    "hero_cta_secondary_link",
                )
            },
        ),
        ("بخش چرا ما", {"fields": ("why_title", "why_description")}),
        ("بخش خودروها", {"fields": ("cars_section_title", "cars_section_description")}),
        (
            "بخش مقالات",
            {"fields": ("articles_section_title", "articles_section_description")},
        ),
        ("بخش شعب", {"fields": ("branches_section_title",)}),
        ("فرم مشاوره", {"fields": ("form_title", "form_description")}),
        ("فوتر", {"fields": ("footer_description", "footer_copyright")}),
        (
            "SEO پیش‌فرض",
            {
                "fields": (
                    "default_seo_title",
                    "default_seo_description",
                    "default_og_image",
                ),
                "classes": ("collapse",),
            },
        ),
    )

    def has_add_permission(self, request):
        return not SiteSettings.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(HeroSlide)
class HeroSlideAdmin(admin.ModelAdmin):
    list_display = ["title", "alt_text", "is_active", "display_order"]
    list_filter = ["is_active"]
    list_editable = ["is_active", "display_order"]


@admin.register(WhyFeature)
class WhyFeatureAdmin(admin.ModelAdmin):
    list_display = ["title", "description", "is_active", "display_order"]
    list_filter = ["is_active"]
    list_editable = ["is_active", "display_order"]


@admin.register(Redirect)
class RedirectAdmin(admin.ModelAdmin):
    list_display = ["old_path", "new_path", "status_code", "is_active", "created_at"]
    list_filter = ["is_active", "status_code"]
    search_fields = ["old_path", "new_path"]
    list_editable = ["is_active"]
