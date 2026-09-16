"""
Shared validators for image uploads.
"""

import os
from io import BytesIO

from django.core.exceptions import ValidationError
from PIL import Image

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
MAX_IMAGE_SIZE_MB = 5
MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024

# Magic bytes for image format validation
MAGIC_BYTES = {
    ".jpg": b"\xff\xd8\xff",
    ".jpeg": b"\xff\xd8\xff",
    ".png": b"\x89PNG\r\n\x1a\n",
    ".webp": b"RIFF",  # WebP starts with RIFF, then file size, then WEBP
}


def validate_magic_bytes(file, ext):
    """
    Validate that file content matches its extension by checking magic bytes.
    Reads first 16 bytes and compares against known signatures.
    """
    if not file:
        return

    # Read first 16 bytes
    file.seek(0)
    header = file.read(16)
    file.seek(0)  # Reset for subsequent reads

    if not header:
        raise ValidationError("فایل خالی است.")

    expected_magic = MAGIC_BYTES.get(ext)
    if not expected_magic:
        return  # Unknown extension, skip magic byte check

    if ext == ".webp":
        # WebP: RIFF at offset 0, WEBP at offset 8
        if len(header) < 12:
            raise ValidationError("فایل WebP معتبر نیست.")
        if header[:4] != b"RIFF" or header[8:12] != b"WEBP":
            raise ValidationError("محتوای فایل با فرمت WebP مطابقت ندارد.")
    else:
        # JPEG, PNG: check magic bytes at start
        if not header.startswith(expected_magic):
            format_name = ext.upper().lstrip(".")
            raise ValidationError(f"محتوای فایل با فرمت {format_name} مطابقت ندارد.")


def validate_dimensions(file, min_width=800, min_height=600, max_width=4000, max_height=3000, max_aspect_ratio=3.0):
    """
    Validate image dimensions using Pillow.
    - Minimum dimensions: 800×600 (configurable)
    - Maximum dimensions: 4000×3000 (configurable)
    - Maximum aspect ratio: 3:1 (configurable)
    """
    if not file:
        return

    try:
        file.seek(0)
        img = Image.open(file)
        img.verify()  # Verify it's a valid image
        file.seek(0)
        img = Image.open(file)  # Re-open after verify
        width, height = img.size
    except Exception:
        raise ValidationError("فایل تصویر معتبر نیست یا قابل خواندن نیست.")

    if width < min_width or height < min_height:
        raise ValidationError(
            f"ابعاد تصویر ({width}×{height}) کوچکتر از حد مجاز ({min_width}×{min_height}) است."
        )

    if width > max_width or height > max_height:
        raise ValidationError(
            f"ابعاد تصویر ({width}×{height}) بزرگتر از حد مجاز ({max_width}×{max_height}) است."
        )

    aspect_ratio = max(width, height) / min(width, height) if min(width, height) > 0 else 0
    if aspect_ratio > max_aspect_ratio:
        raise ValidationError(
            f"نسبت ابعاد تصویر ({aspect_ratio:.1f}:1) بیشتر از حد مجاز ({max_aspect_ratio}:1) است."
        )


def validate_image_file(file):
    """
    Validate an uploaded image file:
    - Check file size (max 5MB)
    - Check file extension (.jpg, .jpeg, .png, .webp)
    - Check MIME type
    - Check magic bytes
    - Check dimensions
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

    # Check magic bytes
    validate_magic_bytes(file, ext)

    # Check dimensions
    validate_dimensions(file)


class ImageValidator:
    """
    Reusable image field validator for DRF serializers.

    Usage in serializer:
        main_image = serializers.ImageField(validators=[ImageValidator()])

    For icons or small images, use lower dimension requirements:
        icon = serializers.ImageField(validators=[ImageValidator(min_width=100, min_height=100)])
    """

    def __init__(
        self,
        max_size_mb=MAX_IMAGE_SIZE_MB,
        allowed_types=None,
        min_width=800,
        min_height=600,
        max_width=4000,
        max_height=3000,
        max_aspect_ratio=3.0,
        check_dimensions=True,
    ):
        self.max_size_mb = max_size_mb
        self.allowed_types = allowed_types or ALLOWED_IMAGE_TYPES
        self.min_width = min_width
        self.min_height = min_height
        self.max_width = max_width
        self.max_height = max_height
        self.max_aspect_ratio = max_aspect_ratio
        self.check_dimensions = check_dimensions

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

        # Check MIME type if available (parity with validate_image_file —
        # this class is what the admin serializers actually mount).
        if hasattr(value, "content_type") and value.content_type:
            if value.content_type not in self.allowed_types:
                raise ValidationError(
                    f"نوع فایل پشتیبانی نمی‌شود. فرمت‌های مجاز: jpg، png، webp"
                )

        # Check magic bytes
        validate_magic_bytes(value, ext)

        # Check dimensions (if enabled)
        if self.check_dimensions:
            validate_dimensions(
                value,
                min_width=self.min_width,
                min_height=self.min_height,
                max_width=self.max_width,
                max_height=self.max_height,
                max_aspect_ratio=self.max_aspect_ratio,
            )

    def set_context(self, serializer_field):
        """Required by DRF validator protocol."""
        pass


class PDFValidator:
    """
    Validator for PDF file uploads.

    Checks:
    - File size (max 10MB by default)
    - File extension (.pdf)
    - Magic bytes (PDF signature)

    Usage in serializer:
        catalog_file = serializers.FileField(validators=[PDFValidator()])
    """

    def __init__(self, max_size_mb=10):
        self.max_size_mb = max_size_mb

    def __call__(self, value):
        if not value:
            return

        # Check file size
        max_bytes = self.max_size_mb * 1024 * 1024
        if value.size > max_bytes:
            size_mb = round(value.size / (1024 * 1024), 1)
            raise ValidationError(
                f"حجم فایل ({size_mb} MB) از حد مجاز ({self.max_size_mb} MB) بیشتر است."
            )

        # Check file extension
        ext = os.path.splitext(value.name)[1].lower()
        if ext != ".pdf":
            raise ValidationError("فرمت فایل باید PDF باشد.")

        # Check magic bytes (PDF signature: %PDF-)
        try:
            value.seek(0)
            header = value.read(5)
            value.seek(0)

            if header != b"%PDF-":
                raise ValidationError("محتوای فایل با فرمت PDF مطابقت ندارد.")
        except Exception:
            raise ValidationError("فایل PDF معتبر نیست یا قابل خواندن نیست.")

    def set_context(self, serializer_field):
        """Required by DRF validator protocol."""
        pass
