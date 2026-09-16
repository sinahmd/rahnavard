"""
Django settings for running tests with SQLite.
"""

from .settings import *  # noqa: F401, F403

# Use SQLite for tests (no PostgreSQL needed)
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",
    }
}

# The auth suite performs dozens of login POSTs from the same client IP and
# would trip the real 5/minute login throttle (Phase 1) partway through.
# The dedicated TestLoginThrottling tests tighten the rate to 5/minute
# themselves (and clear the throttle cache), mirroring the inquiries pattern.
REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"]["login"] = "1000/minute"

# Tests run on LocMemCache: the production file cache (settings.CACHES) would
# write real files into CACHE_DIR inside the test container and carry throttle
# state between runs. The shared-cache contract itself is pinned against the
# production module in apps/accounts/tests.py.
CACHES = {
    "default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}
}
