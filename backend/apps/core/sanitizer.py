"""
Server-side HTML sanitizer for rich-text content fields.

Sanitizes HTML stored in content fields that are later rendered on the
public site via ``dangerouslySetInnerHTML``:
``Car.technical_description`` and ``Article.content``.

Why server-side: those fields are rendered by Next.js Server Components
with no client-side sanitizer, so the write path must guarantee only safe
HTML is ever stored. Sanitization is applied on model ``save()`` and by
the backfill data migrations / management command, so Django admin, DRF
serializers, and direct ORM writes are all covered.

Design decisions
----------------
- Allowlist (tags / attributes / protocols) instead of a denylist.
  Anything not listed is removed (``strip=True``); disallowed element
  content is preserved as inert escaped text so prose is not lost.
- Inline ``style``/``class``/``id`` and all ``on*`` event-handler
  attributes are dropped (presentation is owned by Tailwind / ``prose``,
  and attributes are the common XSS vehicle).
- Allowed protocols: http, https, mailto, tel. Scheme-less (relative)
  URLs such as ``/media/...`` are preserved by bleach.
- ``sanitize_html`` is idempotent: ``sanitize_html(sanitize_html(x)) ==
  sanitize_html(x)``, which makes backfills and migrations safe to re-run.

See docs/SENIOR_REFACTOR_PLAN.md (workstream A, Phase 0).
"""

from bleach import clean as _bleach_clean

# Tags that match how admin content is actually written today: prose
# markup, structured lists, spec-style tables, and inline images.
ALLOWED_TAGS = [
    # Inline text
    "a",
    "abbr",
    "b",
    "br",
    "cite",
    "code",
    "del",
    "em",
    "i",
    "ins",
    "kbd",
    "mark",
    "q",
    "s",
    "samp",
    "small",
    "span",
    "strike",
    "strong",
    "sub",
    "sup",
    "u",
    # Blocks / structure
    "address",
    "blockquote",
    "div",
    "figure",
    "figcaption",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "hr",
    "p",
    "pre",
    # Lists
    "dd",
    "dl",
    "dt",
    "li",
    "ol",
    "ul",
    # Tables
    "caption",
    "col",
    "colgroup",
    "table",
    "tbody",
    "td",
    "tfoot",
    "th",
    "thead",
    "tr",
    # Media
    "img",
]

# Only these attributes survive. Everything else (class, id, style,
# target, on* event handlers, ...) is stripped.
ALLOWED_ATTRIBUTES = {
    "a": ["href", "title"],
    "abbr": ["title"],
    "blockquote": ["cite"],
    "col": ["span"],
    "img": ["src", "alt", "title", "width", "height", "loading"],
    "ol": ["start", "type"],
    "q": ["cite"],
    "td": ["colspan", "rowspan"],
    "th": ["colspan", "rowspan"],
}

# http/https cover absolute media and external links; relative URLs
# (/media/...) are scheme-less and are preserved by bleach regardless.
# mailto/tel cover contact links.
ALLOWED_PROTOCOLS = ["http", "https", "mailto", "tel"]


def sanitize_html(value):
    """
    Return a sanitized copy of ``value``.

    Disallowed tags are removed (their text content is preserved as
    escaped text); disallowed attributes and dangerous URL protocols are
    stripped. ``None``/empty input returns an empty string. Idempotent.
    """
    if not value:
        return ""
    return _bleach_clean(
        value,
        tags=ALLOWED_TAGS,
        attributes=ALLOWED_ATTRIBUTES,
        protocols=ALLOWED_PROTOCOLS,
        strip=True,
    )


def preview_sanitize_field_rows(manager, field_name):
    """
    Count rows in ``manager`` whose ``field_name`` value would change.

    Returns ``(total_rows, rows_that_would_change, rows_already_clean)``.
    Read-only: never writes to the database. Used by the backfill preview
    and by the data migrations to report on what will be cleaned.
    """
    total = 0
    would_change = 0
    for _, raw in manager.values_list("pk", field_name):
        total += 1
        if raw and sanitize_html(raw) != raw:
            would_change += 1
    return total, would_change, total - would_change


def sanitize_field_rows(manager, field_name):
    """
    Sanitize ``field_name`` for every row reachable through ``manager``.

    Rows whose sanitized value equals the stored value are left untouched,
    so the operation is idempotent and safe to re-run after a partial
    failure. Returns the number of rows actually changed.

    ``manager`` must expose ``values_list``/``filter`` and must cover the
    full row set to clean (pass ``Model.objects.with_deleted()`` for
    soft-delete models; data migrations can pass the historical plain
    ``Model.objects`` which already includes soft-deleted rows).
    """
    rows = list(manager.values_list("pk", field_name))
    changed = 0
    for pk, raw in rows:
        if not raw:
            continue
        cleaned = sanitize_html(raw)
        if cleaned != raw:
            manager.filter(pk=pk).update(**{field_name: cleaned})
            changed += 1
    return changed
