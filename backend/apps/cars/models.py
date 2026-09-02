from django.core.validators import FileExtensionValidator
from django.db import models
from django.utils.text import slugify
from django.utils.translation import gettext_lazy as _

from apps.core.mixins import SoftDeleteMixin
from apps.core.models import Redirect


class Car(SoftDeleteMixin, models.Model):
    """Model for cars."""

    FUEL_TYPE_CHOICES = [
        ("gasoline", "بنزینی"),
        ("diesel", "دیزلی"),
        ("hybrid", "هیبریدی"),
        ("electric", "الکتریکی"),
    ]

    TRANSMISSION_CHOICES = [
        ("automatic", "اتوماتیک"),
        ("manual", "دستی"),
    ]

    # Core fields
    brand = models.CharField(max_length=100, verbose_name="برند")
    model = models.CharField(max_length=100, verbose_name="مدل")
    persian_name = models.CharField(max_length=200, verbose_name="نام فارسی")
    slug = models.SlugField(
        max_length=200, db_index=True, allow_unicode=True, blank=True, verbose_name="اسلاگ"
    )
    description = models.TextField(blank=True, verbose_name="توضیحات")
    year = models.IntegerField(verbose_name="سال ساخت")
    fuel_type = models.CharField(
        max_length=50, choices=FUEL_TYPE_CHOICES, verbose_name="نوع سوخت"
    )
    transmission = models.CharField(
        max_length=50, choices=TRANSMISSION_CHOICES, verbose_name="گیربکس"
    )
    engine = models.CharField(max_length=100, blank=True, verbose_name="موتور")
    price = models.DecimalField(
        max_digits=15, decimal_places=0, null=True, blank=True, verbose_name="قیمت"
    )

    # General specifications (visible on the detail page)
    manufacturer = models.CharField(
        max_length=100,
        blank=True,
        verbose_name=_("کشور سازنده"),
    )
    body_type = models.CharField(
        max_length=50,
        blank=True,
        verbose_name=_("نوع بدنه"),
    )
    color = models.CharField(
        max_length=100,
        blank=True,
        verbose_name=_("رنگ بدنه"),
    )

    # Technical description (shown in a tab on the detail page)
    technical_description = models.TextField(
        blank=True,
        verbose_name=_("توضیحات فنی"),
        help_text=_("متن یا HTML برای نمایش در تب توضیحات فنی"),
    )

    # PDF catalogue for the car
    catalog_file = models.FileField(
        upload_to="car_catalogs/",
        blank=True,
        null=True,
        validators=[FileExtensionValidator(allowed_extensions=["pdf"])],
        verbose_name=_("کاتالوگ PDF"),
        help_text=_("فایل PDF کاتالوگ خودرو"),
    )

    # Images
    main_image = models.ImageField(upload_to="cars/", verbose_name="تصویر اصلی")
    gallery = models.JSONField(default=list, blank=True, verbose_name="گالری")

    # Status
    is_active = models.BooleanField(default=True, verbose_name="فعال")
    is_featured = models.BooleanField(default=False, verbose_name="ویژه")
    display_order = models.IntegerField(default=0, verbose_name="ترتیب نمایش")

    # SEO
    seo_title = models.CharField(max_length=200, blank=True, verbose_name="عنوان SEO")
    seo_description = models.TextField(blank=True, verbose_name="توضیحات SEO")
    og_image = models.ImageField(
        upload_to="og/cars/", blank=True, verbose_name="تصویر OG"
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="تاریخ ایجاد")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="تاریخ بروزرسانی")

    class Meta:
        verbose_name = "خودرو"
        verbose_name_plural = "خودروها"
        ordering = ["display_order", "-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=['slug'],
                condition=models.Q(is_deleted=False),
                name='car_slug_unique_when_not_deleted',
            ),
        ]
        indexes = [
            # Most-hit query: COUNT(*) WHERE is_active=True AND is_deleted=False
            models.Index(fields=['is_active', 'is_deleted'], name='car_active_deleted_idx'),
            models.Index(fields=['brand', 'is_active', 'is_deleted']),
            models.Index(fields=['year', 'is_active', 'is_deleted']),
            models.Index(fields=['is_featured', 'is_active', 'is_deleted']),
            models.Index(fields=['display_order', 'created_at']),
            models.Index(fields=['fuel_type', 'is_active']),
            models.Index(fields=['transmission', 'is_active']),
        ]

    def __str__(self):
        return f"{self.brand} {self.model}"

    def save(self, *args, **kwargs):
        # Auto-generate slug if not provided or blank
        if not self.slug or not self.slug.strip():
            self.slug = self._generate_slug()

        # Check if slug changed and create redirect
        # Use with_deleted() to find the old instance even if soft-deleted
        if self.pk:
            try:
                old_instance = Car.objects.with_deleted().get(pk=self.pk)
                if old_instance.slug != self.slug:
                    Redirect.objects.create(
                        old_path=f"/cars/{old_instance.slug}",
                        new_path=f"/cars/{self.slug}",
                        status_code=301,
                    )
            except Car.DoesNotExist:
                pass

        super().save(*args, **kwargs)

    def _generate_slug(self):
        """Generate slug from persian_name or brand+model."""
        base_slug = slugify(f"{self.brand}-{self.model}", allow_unicode=True)
        if not base_slug:
            base_slug = slugify(self.persian_name, allow_unicode=True)
        if not base_slug:
            base_slug = f'car-{self.pk or "new"}'

        # Ensure uniqueness
        slug = base_slug
        counter = 1
        while Car.objects.filter(slug=slug).exclude(pk=self.pk).exists():
            slug = f"{base_slug}-{counter}"
            counter += 1

        return slug
