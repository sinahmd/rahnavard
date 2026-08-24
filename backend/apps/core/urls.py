from django.urls import path

from . import views

urlpatterns = [
    # Public endpoints
    path("settings/", views.SiteSettingsView.as_view(), name="site-settings"),
    path("hero-slides/", views.HeroSlideListView.as_view(), name="hero-slide-list"),
    path("why-features/", views.WhyFeatureListView.as_view(), name="why-feature-list"),
    path("homepage/", views.HomepageDataView.as_view(), name="homepage-data"),
    # Admin endpoints
    path("admin/settings/", views.SiteSettingsAdminView.as_view(), name="admin-site-settings"),
    path("admin/hero-slides/", views.HeroSlideAdminListView.as_view(), name="admin-hero-slide-list"),
    path("admin/hero-slides/<int:pk>/", views.HeroSlideAdminDetailView.as_view(), name="admin-hero-slide-detail"),
    path("admin/features/", views.WhyFeatureAdminListView.as_view(), name="admin-why-feature-list"),
    path("admin/features/<int:pk>/", views.WhyFeatureAdminDetailView.as_view(), name="admin-why-feature-detail"),
]
