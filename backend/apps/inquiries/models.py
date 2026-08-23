from django.db import models


class Inquiry(models.Model):
    """Model for customer inquiries."""

    name = models.CharField(max_length=200, verbose_name="نام")
    phone = models.CharField(max_length=20, verbose_name="تلفن")
    subject = models.CharField(max_length=300, blank=True, verbose_name="موضوع")
    message = models.TextField(blank=True, verbose_name="پیام")

    # Status
    is_read = models.BooleanField(default=False, verbose_name="خوانده شده")
    is_contacted = models.BooleanField(default=False, verbose_name="تماس گرفته شده")

    # Metadata
    ip_address = models.GenericIPAddressField(
        null=True, blank=True, verbose_name="آدرس IP"
    )
    user_agent = models.TextField(blank=True, verbose_name="User Agent")

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="تاریخ ایجاد")

    class Meta:
        verbose_name = "استعلام"
        verbose_name_plural = "استعلامات"
        ordering = ["-created_at"]

    def __str__(self):
        return f'{self.name} - {self.subject or "بدون موضوع"}'
