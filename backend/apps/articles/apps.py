from django.apps import AppConfig


class ArticlesConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.articles"

    def ready(self):
        # Phase 4A: upload-time variant generation for article cover images.
        from apps.core.variant_pipeline import register_receiver
        from .models import Article

        register_receiver(Article, "cover_image")
