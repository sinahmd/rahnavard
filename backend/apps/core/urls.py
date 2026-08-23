from django.urls import path

from . import views

urlpatterns = [
    path("settings/", views.SiteSettingsView.as_view(), name="site-settings"),
    path("hero-slides/", views.HeroSlideListView.as_view(), name="hero-slide-list"),
    path("why-features/", views.WhyFeatureListView.as_view(), name="why-feature-list"),
    path("homepage/", views.HomepageDataView.as_view(), name="homepage-data"),
]
