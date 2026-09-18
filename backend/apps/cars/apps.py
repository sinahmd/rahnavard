from django.apps import AppConfig


class CarsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.cars"

    def ready(self):
        # Phase 4A: upload-time variant generation for car content images.
        from apps.core.variant_pipeline import register_receiver
        from .models import Car

        register_receiver(Car, "main_image")
