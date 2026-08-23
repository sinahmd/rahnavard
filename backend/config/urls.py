"""
URL configuration for Rahnavard Automotive project.
"""

from django.contrib import admin
from django.urls import include, path
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path("django-admin/", admin.site.urls),
    path("api/v1/auth/", include("apps.accounts.urls")),
    path("api/v1/", include("apps.core.urls")),
    path("api/v1/", include("apps.cars.urls")),
    path("api/v1/", include("apps.articles.urls")),
    path("api/v1/", include("apps.branches.urls")),
    path("api/v1/", include("apps.inquiries.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
