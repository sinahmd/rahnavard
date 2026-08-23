from django.db import models


class SiteSettings(models.Model):
    """Singleton model for site-wide settings."""

    site_name = models.CharField(max_length=200, default="راهنورد خودرو")
    site_description = models.TextField(blank=True)
    logo = models.ImageField(upload_to="branding/", blank=True)
    phone = models.CharField(max_length=20, blank=True)
    address = models.TextField(blank=True)

    # Social links
    instagram = models.URLField(blank=True)
    telegram = models.URLField(blank=True)
    whatsapp = models.CharField(max_length=20, blank=True)

    # SEO defaults
    default_seo_title = models.CharField(max_length=200, blank=True)
    default_seo_description = models.TextField(blank=True)
    default_og_image = models.ImageField(upload_to="og/", blank=True)

    # Hero Section
    hero_cta_primary_text = models.CharField(
        max_length=100, default="مشاهده خودروها", verbose_name="متن دکمه اصلی هیرو"
    )
    hero_cta_primary_link = models.CharField(
        max_length=200, default="#cars", verbose_name="لینک دکمه اصلی"
    )
    hero_cta_secondary_text = models.CharField(
        max_length=100, default="درخواست مشاوره", verbose_name="متن دکمه فرعی هیرو"
    )
    hero_cta_secondary_link = models.CharField(
        max_length=200, default="#consult", verbose_name="لینک دکمه فرعی"
    )

    # Why Section
    why_title = models.CharField(
        max_length=200, default="چرا راهنورد خودرو؟", verbose_name="عنوان بخش چرا ما"
    )
    why_description = models.TextField(
        default="راهنورد خودرو با تمرکز بر واردات خودروهای روز دنیا، تلاش می‌کند تجربه‌ای مطمئن، شفاف و حرفه‌ای در خرید خودروهای وارداتی برای مشتریان خود فراهم کند.",
        verbose_name="توضیحات بخش چرا ما",
    )

    # Cars Section
    cars_section_title = models.CharField(
        max_length=200, default="خودروهای ما", verbose_name="عنوان بخش خودروها"
    )
    cars_section_description = models.TextField(
        default="مجموعه‌ای منتخب از خودروهای وارداتی راهنورد خودرو، آماده تحویل با گارانتی رسمی.",
        verbose_name="توضیحات بخش خودروها",
    )

    # Articles Section
    articles_section_title = models.CharField(
        max_length=200, default="مقاله و اطلاعیه", verbose_name="عنوان بخش مقالات"
    )
    articles_section_description = models.TextField(
        default="آخرین اخبار، اطلاعیه‌ها و راهنماهای خرید خودرو را دنبال کنید.",
        verbose_name="توضیحات بخش مقالات",
    )

    # Branches Section
    branches_section_title = models.CharField(
        max_length=200, default="شعب راهنورد خودرو", verbose_name="عنوان بخش شعب"
    )

    # Consultation Form
    form_title = models.CharField(
        max_length=200,
        default="درخواست خود را برای ما ارسال نمایید",
        verbose_name="عنوان فرم مشاوره",
    )
    form_description = models.TextField(
        default="همکاران ما در کوتاه‌ترین زمان ممکن با شما تماس خواهند گرفت.",
        verbose_name="توضیحات فرم مشاوره",
    )

    # Footer
    footer_description = models.TextField(
        default="راهنورد خودرو ، واردکننده رسمی خودروهای هیوندای، کیا و تویوتا با بیش از یک دهه تجربه در خدمت مشتریان.",
        verbose_name="توضیحات فوتر",
    )
    footer_copyright = models.CharField(
        max_length=200,
        default="راهنورد خودرو. تمامی حقوق محفوظ است.",
        verbose_name="متن کپی‌رایت",
    )

    class Meta:
        verbose_name = "Site Settings"
        verbose_name_plural = "Site Settings"

    def save(self, *args, **kwargs):
        # Ensure only one instance exists
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def load(cls):
        obj, created = cls.objects.get_or_create(pk=1)
        return obj

    def __str__(self):
        return self.site_name


class HeroSlide(models.Model):
    """Model for hero slider images."""

    title = models.CharField(max_length=200, blank=True, verbose_name="عنوان")
    image = models.ImageField(upload_to="hero/", verbose_name="تصویر")
    alt_text = models.CharField(max_length=300, verbose_name="متن جایگزین")
    is_active = models.BooleanField(default=True, verbose_name="فعال")
    display_order = models.IntegerField(default=0, verbose_name="ترتیب نمایش")

    class Meta:
        verbose_name = "اسلاید هیرو"
        verbose_name_plural = "اسلایدهای هیرو"
        ordering = ["display_order"]

    def __str__(self):
        return self.title or f"اسلاید {self.pk}"


class WhyFeature(models.Model):
    """Model for Why Rahnavard features."""

    title = models.CharField(max_length=100, verbose_name="عنوان")
    description = models.CharField(max_length=300, verbose_name="توضیحات")
    icon = models.ImageField(upload_to="features/", blank=True, verbose_name="آیکون")
    is_active = models.BooleanField(default=True, verbose_name="فعال")
    display_order = models.IntegerField(default=0, verbose_name="ترتیب نمایش")

    class Meta:
        verbose_name = "ویژگی چرا ما"
        verbose_name_plural = "ویژگی‌های چرا ما"
        ordering = ["display_order"]

    def __str__(self):
        return self.title


class Redirect(models.Model):
    """Model for managing URL redirects when slugs change."""

    old_path = models.CharField(max_length=500, unique=True, db_index=True)
    new_path = models.CharField(max_length=500)
    status_code = models.IntegerField(default=301)  # 301 or 302
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Redirect"
        verbose_name_plural = "Redirects"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.old_path} -> {self.new_path}"
