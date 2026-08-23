from django.db import models


class Branch(models.Model):
    """Model for company branches."""

    name = models.CharField(max_length=200, verbose_name="نام شعبه")
    address = models.TextField(verbose_name="آدرس")
    phone = models.CharField(max_length=20, verbose_name="تلفن")
    map_url = models.URLField(verbose_name="لینک نقشه")
    map_image = models.ImageField(upload_to="branches/", verbose_name="تصویر نقشه")
    latitude = models.DecimalField(
        max_digits=10,
        decimal_places=7,
        null=True,
        blank=True,
        verbose_name="عرض جغرافیایی",
    )
    longitude = models.DecimalField(
        max_digits=10,
        decimal_places=7,
        null=True,
        blank=True,
        verbose_name="طول جغرافیایی",
    )
    is_active = models.BooleanField(default=True, verbose_name="فعال")
    display_order = models.IntegerField(default=0, verbose_name="ترتیب نمایش")

    class Meta:
        verbose_name = "شعبه"
        verbose_name_plural = "شعب"
        ordering = ["display_order"]

    def __str__(self):
        return self.name
