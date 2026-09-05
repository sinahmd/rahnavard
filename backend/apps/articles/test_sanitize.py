import pytest

from apps.core.sanitizer import (
    preview_sanitize_field_rows,
    sanitize_field_rows,
)
from .models import Article

DANGEROUS_HTML = (
    '<p>مقدمه</p>'
    '<iframe src="https://evil.example"></iframe>'
    '<img src="x" onerror="alert(document.cookie)">'
    '<a href="javascript:void(0)">bad</a>'
)


@pytest.mark.django_db
class TestArticleContentSanitization:
    """Article.content is sanitized on every save."""

    def test_dangerous_html_is_sanitized_on_create(self):
        article = Article.objects.create(title='مقاله', content=DANGEROUS_HTML)
        article.refresh_from_db()

        cleaned = article.content
        assert 'iframe' not in cleaned
        assert 'onerror' not in cleaned
        assert 'javascript:' not in cleaned
        assert 'مقدمه' in cleaned

    def test_dangerous_html_is_sanitized_on_update(self):
        article = Article.objects.create(title='مقاله', content='<p>سالم</p>')
        article.content = DANGEROUS_HTML
        article.save()
        article.refresh_from_db()
        assert 'iframe' not in article.content

    def test_legitimate_html_is_preserved(self):
        safe = (
            '<h1>عنوان خبر</h1>'
            '<p>بدنه <strong>مطلب</strong> با '
            '<a href="https://rahnavard.co/cars">لینک</a>.</p>'
            '<ul><li>نکته اول</li><li>نکته دوم</li></ul>'
            '<blockquote><p>نقل قول</p></blockquote>'
            '<figure><img src="/media/articles/c.jpg" alt="تصویر">'
            '<figcaption>توضیح</figcaption></figure>'
        )
        article = Article.objects.create(title='مقاله', content=safe)
        assert article.content == safe

    def test_sanitized_value_is_idempotent(self):
        article = Article.objects.create(title='مقاله', content=DANGEROUS_HTML)
        first = article.content
        article.save()
        assert article.content == first


@pytest.mark.django_db
class TestArticleBackfill:
    """Backfill helpers clean pre-existing article rows."""

    def _inject_raw_html(self, article, html):
        Article.objects.filter(pk=article.pk).update(content=html)
        article.refresh_from_db()
        assert 'iframe' in article.content

    def test_preview_counts_rows_that_would_change(self):
        dirty = Article.objects.create(title='قدیمی', content='<p>x</p>')
        self._inject_raw_html(dirty, DANGEROUS_HTML)
        Article.objects.create(title='تمیز', content='<p>خوب</p>')

        total, would_change, clean = preview_sanitize_field_rows(
            Article.objects.with_deleted(), 'content'
        )
        assert total == 2
        assert would_change == 1
        assert clean == 1

    def test_backfill_updates_dirty_rows_and_is_idempotent(self):
        dirty = Article.objects.create(title='قدیمی', content='x')
        self._inject_raw_html(dirty, DANGEROUS_HTML)
        manager = Article.objects.with_deleted()

        assert sanitize_field_rows(manager, 'content') == 1
        dirty.refresh_from_db()
        assert 'iframe' not in dirty.content
        assert sanitize_field_rows(manager, 'content') == 0

    def test_backfill_covers_soft_deleted_rows(self):
        dirty = Article.objects.create(title='حذف‌شده', content='x')
        self._inject_raw_html(dirty, DANGEROUS_HTML)
        dirty.soft_delete()

        assert sanitize_field_rows(
            Article.objects.with_deleted(), 'content'
        ) == 1

        row = Article.objects.with_deleted().get(pk=dirty.pk)
        assert 'iframe' not in row.content
        assert row.is_deleted is True
