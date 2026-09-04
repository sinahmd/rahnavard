import pytest

from .sanitizer import ALLOWED_ATTRIBUTES, ALLOWED_PROTOCOLS, sanitize_html


class TestSanitizeHtmlDangerousContent:
    """Sanitizer must neutralize XSS payloads."""

    def test_removes_script_tags(self):
        cleaned = sanitize_html('<p>ok</p><script>alert(1)</script><p>bye</p>')
        assert '<script' not in cleaned
        assert 'script' not in cleaned

    def test_removes_event_handler_attributes(self):
        cleaned = sanitize_html(
            '<img src="x.jpg" onerror="alert(1)" onload="alert(2)">'
        )
        assert 'onerror' not in cleaned
        assert 'onload' not in cleaned
        assert cleaned == '<img src="x.jpg">'

    def test_strips_javascript_urls_from_links(self):
        cleaned = sanitize_html(
            '<a href="javascript:alert(1)" onclick="x()">link</a>'
        )
        assert 'javascript:' not in cleaned
        assert cleaned == '<a>link</a>'

    def test_strips_data_urls_from_images(self):
        cleaned = sanitize_html('<img src="data:image/svg+xml;base64,PHN2Zz4=">')
        assert 'data:' not in cleaned
        assert cleaned == '<img>'

    def test_removes_embedded_content_tags(self):
        payload = (
            '<iframe src="https://evil.example"></iframe>'
            '<object data="x"></object>'
            '<embed src="x">'
            '<video src="x.mp4" onerror="alert(1)"></video>'
            '<svg onload="alert(1)"></svg>'
            '<p>survives</p>'
        )
        cleaned = sanitize_html(payload)
        for tag in ('iframe', 'object', 'embed', 'video', 'svg'):
            assert f'<{tag}' not in cleaned
        assert 'survives' in cleaned

    def test_removes_meta_refresh(self):
        cleaned = sanitize_html('<meta http-equiv="refresh" content="0">x')
        assert 'meta' not in cleaned.lower()
        assert cleaned == 'x'

    def test_strips_style_class_id_and_target(self):
        cleaned = sanitize_html(
            '<p style="background:url(javascript:x)" class="x" id="y">text</p>'
            '<a href="https://a.com" target="_blank" rel="noopener">go</a>'
        )
        assert 'style=' not in cleaned
        assert 'class=' not in cleaned
        assert 'id=' not in cleaned
        assert 'target=' not in cleaned
        assert cleaned == '<p>text</p><a href="https://a.com">go</a>'


class TestSanitizeHtmlLegitimateContent:
    """Sanitizer must preserve the HTML the site's content actually uses."""

    def test_allows_safe_link_protocols(self):
        cleaned = sanitize_html(
            '<a href="https://rahnavard.co/x">a</a>'
            '<a href="http://example.com/x">b</a>'
            '<a href="mailto:info@example.com">c</a>'
            '<a href="tel:+989112100800">d</a>'
            '<a href="/media/a.pdf">e</a>'
            '<a href="//cdn.example.com/x.js">f</a>'
        )
        assert 'https://rahnavard.co/x' in cleaned
        assert 'http://example.com/x' in cleaned
        assert 'mailto:info@example.com' in cleaned
        assert 'tel:+989112100800' in cleaned
        assert 'href="/media/a.pdf"' in cleaned
        assert 'href="//cdn.example.com/x.js"' in cleaned

    def test_preserves_images_with_relative_and_absolute_src(self):
        cleaned = sanitize_html(
            '<img src="/media/cars/gallery/1.jpg" alt="نما" width="400" '
            'height="300" loading="lazy">'
            '<img src="https://rahnavard.co/media/x.jpg" alt="a">'
        )
        assert 'src="/media/cars/gallery/1.jpg"' in cleaned
        assert 'src="https://rahnavard.co/media/x.jpg"' in cleaned
        assert 'alt="نما"' in cleaned
        assert 'width="400"' in cleaned and 'height="300"' in cleaned
        assert 'loading="lazy"' in cleaned

    def test_preserves_legitimate_document_structure(self):
        cleaned = sanitize_html(
            '<h2>عنوان</h2>'
            '<h3>زیر عنوان</h3>'
            '<p>متن <strong>bold</strong> و <em>italic</em> و '
            '<a href="https://x.com" title="t">لینک</a>.</p>'
            '<ul><li>یک</li><li>دو</li></ul>'
            '<ol start="3"><li>سه</li></ol>'
            '<blockquote><p>نقل قول</p></blockquote>'
            '<pre><code>code()</code></pre>'
            '<hr>'
            'خط<br>شکن'
        )
        for marker in (
            '<h2>عنوان</h2>',
            '<h3>زیر عنوان</h3>',
            '<strong>bold</strong>',
            '<em>italic</em>',
            'href="https://x.com" title="t"',
            '<ul><li>یک</li><li>دو</li></ul>',
            '<ol start="3"><li>سه</li></ol>',
            '<blockquote>',
            '<pre><code>code()</code></pre>',
            '<hr>',
            '<br>',
        ):
            assert marker in cleaned, f'missing {marker}: {cleaned!r}'

    def test_preserves_tables_with_span_attributes(self):
        cleaned = sanitize_html(
            '<table>'
            '<caption>مشخصات</caption>'
            '<thead><tr><th colspan="2">H</th></tr></thead>'
            '<tbody><tr><td rowspan="2">A</td><td>B</td></tr></tbody>'
            '</table>'
        )
        assert '<table>' in cleaned
        assert '<caption>مشخصات</caption>' in cleaned
        assert '<th colspan="2">H</th>' in cleaned
        assert '<td rowspan="2">A</td>' in cleaned

    def test_plain_persian_text_is_unchanged(self):
        text = 'متن ساده بدون HTML — «گیلان» و ۱۲۳'
        assert sanitize_html(text) == text

    def test_escaped_text_stays_escaped(self):
        cleaned = sanitize_html('<p>a &amp; b &lt;script&gt;</p>')
        assert cleaned == '<p>a &amp; b &lt;script&gt;</p>'


class TestSanitizeHtmlEdgeCases:
    """Sanitizer edge cases."""

    def test_none_and_empty(self):
        assert sanitize_html(None) == ''
        assert sanitize_html('') == ''

    def test_is_idempotent(self):
        payload = (
            '<p>ok <a href="javascript:x" onclick="e">l</a> '
            '<img src="/media/a.jpg"><table><tr><td>1</td></tr></table></p>'
        )
        once = sanitize_html(payload)
        assert sanitize_html(once) == once

    def test_disallowed_tag_content_survives_as_inert_text(self):
        # Content of removed elements is preserved as text, never executed.
        cleaned = sanitize_html('<p>before</p><style>.x{}</style><p>after</p>')
        assert 'before' in cleaned and 'after' in cleaned

    def test_protocol_and_attribute_allowlists_are_exported(self):
        assert 'https' in ALLOWED_PROTOCOLS
        assert 'img' in ALLOWED_ATTRIBUTES


class TestSanitizeHtmlObfuscation:
    """Sanitizer must neutralize obfuscated payloads, not just literal ones.

    Expected outputs below were captured empirically from bleach 6.x +
    html5lib (see probe in the Phase 0 review). If a bleach upgrade ever
    changes one of these outputs, the test failure will show exactly how
    the behavior drifted.
    """

    def test_case_insensitive_scheme(self):
        assert sanitize_html('<a href="JaVaScRiPt:alert(1)">x</a>') == '<a>x</a>'

    def test_html_entity_encoded_scheme(self):
        # html5lib decodes entities before filtering, so this is caught.
        assert sanitize_html('<a href="&#106;avascript:alert(1)">x</a>') == '<a>x</a>'

    def test_whitespace_in_scheme(self):
        assert sanitize_html('<a href="java\nscript:alert(1)">x</a>') == '<a>x</a>'

    @pytest.mark.parametrize(
        'href',
        [
            'vbscript:msgbox(1)',
            'file:///etc/passwd',
            'data:text/html;base64,PHNjcmlwdD4=',
        ],
    )
    def test_other_dangerous_schemes_stripped(self, href):
        assert sanitize_html(f'<a href="{href}">x</a>') == '<a>x</a>'

    def test_iframe_srcdoc(self):
        # Iframe (disallowed tag) removed entirely, srcdoc payload inert.
        payload = '<iframe srcdoc="<script>alert(1)</script>"></iframe>'
        assert sanitize_html(payload) == ''

    def test_mxss_svg_style_nest(self):
        # Classic mXSS vector: browsers re-parse <svg><style>...</style></svg>.
        cleaned = sanitize_html(
            '<svg><style><img src=x onerror=alert(1)></style></svg>'
        )
        assert '<svg' not in cleaned and '<style' not in cleaned
        assert 'onerror' not in cleaned and 'alert(1)' not in cleaned

    def test_mxss_math_mtext_nest(self):
        cleaned = sanitize_html(
            '<math><mtext><img src=x onerror=alert(1)></mtext></math>'
        )
        assert 'math' not in cleaned
        assert 'onerror' not in cleaned and 'alert(1)' not in cleaned

    def test_form_action_javascript(self):
        # <form> is not allowlisted; disallowed-tag removal also kills the
        # action attribute vector.
        assert sanitize_html('<form action="javascript:alert(1)"></form>') == ''

    def test_encoded_style_attribute(self):
        assert sanitize_html(
            '<p style="background&#58;url(javascript:alert(1))">x</p>'
        ) == '<p>x</p>'

    def test_encoded_event_handler_attribute_name(self):
        assert sanitize_html(
            '<img src="x" onerror&#61;"alert(1)">'
        ) == '<img src="x">'

    def test_entity_encoded_script_text_is_inert(self):
        # Literal <script> typed as text stays escaped; never executable.
        payload = '<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>'
        assert sanitize_html(payload) == payload

    def test_plain_language_word_not_stripped(self):
        # Persian for "JavaScript" must survive — proof the sanitizer is
        # allowlist-based, not a naive dangerous-keyword filter.
        text = '<p>این جاوااسکریپت است</p>'
        assert sanitize_html(text) == text


@pytest.mark.django_db
class TestBackfillSanitizeCommand:
    """The backfill_sanitize management command."""

    def _make_dirty_article(self):
        from apps.articles.models import Article

        article = Article.objects.create(title='قدیمی', content='x')
        Article.objects.filter(pk=article.pk).update(
            content='<p>متن</p><script>alert(1)</script>'
        )
        article.refresh_from_db()
        return article

    def test_dry_run_previews_without_writing(self):
        from io import StringIO

        from django.core.management import call_command

        article = self._make_dirty_article()
        out = StringIO()
        call_command(
            'backfill_sanitize', '--model', 'article', stdout=out
        )
        assert '1 would change' in out.getvalue()

        # Preview must not have written anything
        article.refresh_from_db()
        assert '<script' in article.content

    def test_apply_sanitizes_rows(self):
        from io import StringIO

        from django.core.management import call_command

        article = self._make_dirty_article()
        out = StringIO()
        call_command(
            'backfill_sanitize', '--model', 'article', '--apply', stdout=out
        )
        assert '1 of 1 row(s) updated' in out.getvalue()

        article.refresh_from_db()
        assert '<script' not in article.content
        assert 'متن' in article.content
