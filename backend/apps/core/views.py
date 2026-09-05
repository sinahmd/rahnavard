from rest_framework import generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.articles.models import Article
from apps.branches.models import Branch
from apps.cars.models import Car
from apps.inquiries.models import Inquiry

from .models import HeroSlide, SiteSettings, WhyFeature
from .serializers import (
    HeroSlideSerializer,
    SiteSettingsSerializer,
    WhyFeatureSerializer,
)


class SiteSettingsView(generics.RetrieveAPIView):
    """Public endpoint for site settings."""

    serializer_class = SiteSettingsSerializer
    permission_classes = [permissions.AllowAny]

    def get_object(self):
        return SiteSettings.load()


class HeroSlideListView(generics.ListAPIView):
    """Public endpoint for active hero slides."""

    serializer_class = HeroSlideSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        return HeroSlide.objects.filter(is_active=True)


class WhyFeatureListView(generics.ListAPIView):
    """Public endpoint for active why features."""

    serializer_class = WhyFeatureSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        return WhyFeature.objects.filter(is_active=True)


class HomepageDataView(generics.GenericAPIView):
    """Combined endpoint for all homepage data."""

    permission_classes = [permissions.AllowAny]

    def get(self, request):
        settings = SiteSettings.load()
        hero_slides = HeroSlide.objects.filter(is_active=True)
        why_features = WhyFeature.objects.filter(is_active=True)

        return Response(
            {
                "settings": SiteSettingsSerializer(settings).data,
                "hero_slides": HeroSlideSerializer(hero_slides, many=True).data,
                "why_features": WhyFeatureSerializer(why_features, many=True).data,
            }
        )


# ==========================================================================
# Admin Endpoints
# ==========================================================================


class AdminStatsView(APIView):
    """Aggregate dashboard counts for the admin panel.

    One endpoint replaces the old dashboard's four page-1 client fetches
    (which under-reported once a list exceeded the page size). Each count is
    a direct SQL COUNT over the manager semantics the corresponding card
    implies: active cars, published articles, active branches, and all
    inquiries including soft-deleted ones (matching the admin inquiries
    list total, which also includes them). Only staff may read it.
    """

    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        return Response(
            {
                "cars": Car.objects.filter(is_active=True).count(),
                "articles": Article.objects.filter(is_published=True).count(),
                "branches": Branch.objects.filter(is_active=True).count(),
                "inquiries": Inquiry.objects.with_deleted().count(),
            }
        )


class SiteSettingsAdminView(generics.RetrieveUpdateAPIView):
    """Admin endpoint for site settings."""

    serializer_class = SiteSettingsSerializer
    permission_classes = [permissions.IsAdminUser]

    def get_object(self):
        return SiteSettings.load()


class HeroSlideAdminListView(generics.ListCreateAPIView):
    """Admin endpoint for listing and creating hero slides."""

    serializer_class = HeroSlideSerializer
    queryset = HeroSlide.objects.all()
    permission_classes = [permissions.IsAdminUser]
    ordering_fields = ["display_order"]


class HeroSlideAdminDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Admin endpoint for hero slide detail, update, and delete."""

    serializer_class = HeroSlideSerializer
    queryset = HeroSlide.objects.all()
    permission_classes = [permissions.IsAdminUser]


class WhyFeatureAdminListView(generics.ListCreateAPIView):
    """Admin endpoint for listing and creating why features."""

    serializer_class = WhyFeatureSerializer
    queryset = WhyFeature.objects.all()
    permission_classes = [permissions.IsAdminUser]
    ordering_fields = ["display_order"]


class WhyFeatureAdminDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Admin endpoint for why feature detail, update, and delete."""

    serializer_class = WhyFeatureSerializer
    queryset = WhyFeature.objects.all()
    permission_classes = [permissions.IsAdminUser]
