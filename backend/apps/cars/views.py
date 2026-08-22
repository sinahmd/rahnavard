from rest_framework import generics, filters
from django_filters.rest_framework import DjangoFilterBackend
from .models import Car
from .serializers import CarListSerializer, CarDetailSerializer, CarAdminSerializer


class CarListView(generics.ListAPIView):
    """Public endpoint for listing active cars."""
    serializer_class = CarListSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['brand', 'fuel_type', 'transmission', 'is_featured']
    search_fields = ['brand', 'model', 'persian_name', 'description']
    ordering_fields = ['display_order', 'created_at', 'year', 'price']

    def get_queryset(self):
        return Car.objects.filter(is_active=True)


class CarDetailView(generics.RetrieveAPIView):
    """Public endpoint for car detail."""
    serializer_class = CarDetailSerializer
    lookup_field = 'slug'

    def get_queryset(self):
        return Car.objects.filter(is_active=True)


class CarAdminListView(generics.ListCreateAPIView):
    """Admin endpoint for listing and creating cars."""
    serializer_class = CarAdminSerializer
    queryset = Car.objects.all()
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['brand', 'is_active', 'is_featured']
    search_fields = ['brand', 'model', 'persian_name']


class CarAdminDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Admin endpoint for car detail, update, and delete."""
    serializer_class = CarAdminSerializer
    queryset = Car.objects.all()
