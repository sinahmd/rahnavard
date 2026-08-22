from rest_framework import generics
from rest_framework.response import Response
from .models import SiteSettings, HeroSlide, WhyFeature
from .serializers import SiteSettingsSerializer, HeroSlideSerializer, WhyFeatureSerializer


class SiteSettingsView(generics.RetrieveAPIView):
    """Public endpoint for site settings."""
    serializer_class = SiteSettingsSerializer

    def get_object(self):
        return SiteSettings.load()


class HeroSlideListView(generics.ListAPIView):
    """Public endpoint for active hero slides."""
    serializer_class = HeroSlideSerializer

    def get_queryset(self):
        return HeroSlide.objects.filter(is_active=True)


class WhyFeatureListView(generics.ListAPIView):
    """Public endpoint for active why features."""
    serializer_class = WhyFeatureSerializer

    def get_queryset(self):
        return WhyFeature.objects.filter(is_active=True)


class HomepageDataView(generics.GenericAPIView):
    """Combined endpoint for all homepage data."""
    def get(self, request):
        settings = SiteSettings.load()
        hero_slides = HeroSlide.objects.filter(is_active=True)
        why_features = WhyFeature.objects.filter(is_active=True)

        return Response({
            'settings': SiteSettingsSerializer(settings).data,
            'hero_slides': HeroSlideSerializer(hero_slides, many=True).data,
            'why_features': WhyFeatureSerializer(why_features, many=True).data,
        })
