from django.db import models
from django.utils.text import slugify

from apps.core.mixins import SoftDeleteMixin
from apps.core.models import Redirect
from apps.core.sanitizer import sanitize_html


class Article(SoftDeleteMixin, models.Model):
    """Model for articles."""

    title = models.CharField(max_length=300, verbose_name="عنوان")
    slug = models.SlugField(
        max_length=300, db_index=True, allow_unicode=True, blank=True, verbose_name="اسلاگ"
    )
    excerpt = models.TextField(blank=True, verbose_name="خلاصه")
    content = models.TextField(verbose_name="محتوا")
    cover_image = models.ImageField(
        upload_to="articles/", blank=True, verbose_name="تصویر کاور"
    )

    # Status
    is_published = models.BooleanField(default=False, verbose_name="منتشر شده")
    published_at = models.DateTimeField(
        null=True, blank=True, verbose_name="تاریخ انتشار"
    )

    # SEO
    seo_title = models.CharField(max_length=200, blank=True, verbose_name="عنوان SEO")
    seo_description = models.TextField(blank=True, verbose_name="توضیحات SEO")
    og_image = models.ImageField(
        upload_to="og/articles/", blank=True, verbose_name="تصویر OG"
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="تاریخ ایجاد")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="تاریخ بروزرسانی")

    class Meta:
        verbose_name = "مقاله"
        verbose_name_plural = "مقالات"
        ordering = ["-published_at"]
        constraints = [
            models.UniqueConstraint(
                fields=['slug'],
                condition=models.Q(is_deleted=False),
                name='article_slug_unique_when_not_deleted',
            ),
        ]
        indexes = [
            models.Index(fields=['is_published', 'published_at', 'is_deleted']),
        ]

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        # Sanitize HTML on every write so stored content is always safe to
        # render on the public site (rendered via dangerouslySetInnerHTML).
        if self.content:
            cleaned = sanitize_html(self.content)
            if cleaned != self.content:
                self.content = cleaned

        # Auto-generate slug if not provided or blank
        if not self.slug or not self.slug.strip():
            self.slug = self._generate_slug()

        # Check if slug changed and create redirect
        # Use with_deleted() to find the old instance even if soft-deleted
        if self.pk:
            try:
                old_instance = Article.objects.with_deleted().get(pk=self.pk)
                if old_instance.slug != self.slug:
                    Redirect.objects.create(
                        old_path=f"/articles/{old_instance.slug}",
                        new_path=f"/articles/{self.slug}",
                        status_code=301,
                    )
            except Article.DoesNotExist:
                pass

        super().save(*args, **kwargs)

    def _generate_slug(self):
        """Generate slug from title."""
        base_slug = slugify(self.title, allow_unicode=True)
        if not base_slug:
            base_slug = f'article-{self.pk or "new"}'

        # Ensure uniqueness
        slug = base_slug
        counter = 1
        while Article.objects.filter(slug=slug).exclude(pk=self.pk).exists():
            slug = f"{base_slug}-{counter}"
            counter += 1

        return slug
