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
