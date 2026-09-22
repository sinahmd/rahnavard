from django.apps import AppConfig


class CoreConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.core"

    def ready(self):
        # Phase 4A: upload-time variant generation for core-owned content
        # images (hero slides). Registered in ready() per Django convention.
        from .variant_pipeline import register_receiver
        from .models import HeroSlide, SiteSettings

        register_receiver(HeroSlide, "image")
        # SiteSettings.why_background — one optional section background. The
        # receiver no-ops on every unrelated settings save (empty field or
        # complete set), so the singleton's frequent saves stay cheap.
        register_receiver(SiteSettings, "why_background")
