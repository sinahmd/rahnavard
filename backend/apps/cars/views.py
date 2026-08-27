from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, generics, permissions, status
from rest_framework.response import Response

from .models import Car
from .serializers import CarAdminSerializer, CarDetailSerializer, CarListSerializer


class CarListView(generics.ListAPIView):
    """Public endpoint for listing active cars."""

    serializer_class = CarListSerializer
    permission_classes = [permissions.AllowAny]
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_fields = ["brand", "fuel_type", "transmission", "is_featured"]
    search_fields = ["brand", "model", "persian_name", "description"]
    ordering_fields = ["display_order", "created_at", "year", "price"]

    def get_queryset(self):
        return Car.objects.filter(is_active=True)


class CarDetailView(generics.RetrieveAPIView):
    """Public endpoint for car detail."""

    serializer_class = CarDetailSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = "slug"

    def get_queryset(self):
        return Car.objects.filter(is_active=True)


class CarAdminListView(generics.ListCreateAPIView):
    """Admin endpoint for listing and creating cars."""

    serializer_class = CarAdminSerializer
    permission_classes = [permissions.IsAdminUser]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ["brand", "is_active", "is_featured"]
    search_fields = ["brand", "model", "persian_name"]

    def get_queryset(self):
        """Include soft-deleted items in admin."""
        return Car.objects.with_deleted()


class CarAdminDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Admin endpoint for car detail, update, and delete."""

    serializer_class = CarAdminSerializer
    permission_classes = [permissions.IsAdminUser]

    def get_queryset(self):
        """Include soft-deleted items in admin."""
        return Car.objects.with_deleted()

    def perform_destroy(self, instance):
        """Soft delete instead of hard delete."""
        instance.soft_delete()


class CarRestoreView(generics.GenericAPIView):
    """Admin endpoint to restore a soft-deleted car."""

    serializer_class = CarAdminSerializer
    permission_classes = [permissions.IsAdminUser]

    def get_queryset(self):
        return Car.objects.with_deleted()

    def post(self, request, pk=None):
        instance = self.get_object()
        if not instance.is_deleted:
            return Response(
                {'detail': 'This car is not soft-deleted.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        instance.restore()
        serializer = self.get_serializer(instance)
        return Response(serializer.data, status=status.HTTP_200_OK)
