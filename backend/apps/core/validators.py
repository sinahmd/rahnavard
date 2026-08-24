"""
Shared validators for image uploads.
"""

import os

from django.core.exceptions import ValidationError

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
MAX_IMAGE_SIZE_MB = 5
MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024


def validate_image_file(file):
    """
    Validate an uploaded image file:
    - Check file size (max 5MB)
    - Check file extension (.jpg, .jpeg, .png, .webp)
    - Check MIME type
    """
    if not file:
        return

    # Check file size
    if file.size > MAX_IMAGE_SIZE_BYTES:
        size_mb = round(file.size / (1024 * 1024), 1)
        raise ValidationError(
            f"حجم فایل ({size_mb} MB) از حد مجاز ({MAX_IMAGE_SIZE_MB} MB) بیشتر است."
        )

    # Check file extension
    ext = os.path.splitext(file.name)[1].lower()
    if ext not in ALLOWED_IMAGE_EXTENSIONS:
        raise ValidationError(
            f"فرمت فایل پشتیبانی نمی‌شود. فرمت‌های مجاز: jpg، png، webp"
        )

    # Check MIME type if available
    if hasattr(file, "content_type") and file.content_type:
        if file.content_type not in ALLOWED_IMAGE_TYPES:
            raise ValidationError(
                f"نوع فایل پشتیبانی نمی‌شود. فرمت‌های مجاز: jpg، png، webp"
            )


class ImageValidator:
    """
    Reusable image field validator for DRF serializers.

    Usage in serializer:
        main_image = serializers.ImageField(validators=[ImageValidator()])
    """

    def __init__(self, max_size_mb=MAX_IMAGE_SIZE_MB, allowed_types=None):
        self.max_size_mb = max_size_mb
        self.allowed_types = allowed_types or ALLOWED_IMAGE_TYPES

    def __call__(self, value):
        if not value:
            return

        max_bytes = self.max_size_mb * 1024 * 1024
        if value.size > max_bytes:
            size_mb = round(value.size / (1024 * 1024), 1)
            raise ValidationError(
                f"حجم فایل ({size_mb} MB) از حد مجاز ({self.max_size_mb} MB) بیشتر است."
            )

        ext = os.path.splitext(value.name)[1].lower()
        if ext not in ALLOWED_IMAGE_EXTENSIONS:
            raise ValidationError(
                f"فرمت فایل پشتیبانی نمی‌شود. فرمت‌های مجاز: jpg، png، webp"
            )

    def set_context(self, serializer_field):
        """Required by DRF validator protocol."""
        pass
