import django_filters
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, generics, permissions, status
from rest_framework.response import Response

from .models import Car
from .serializers import CarAdminSerializer, CarDetailSerializer, CarListSerializer


class CarFilter(django_filters.FilterSet):
    """FilterSet for public car listing with range filters."""

    min_price = django_filters.NumberFilter(field_name="price", lookup_expr="gte")
    max_price = django_filters.NumberFilter(field_name="price", lookup_expr="lte")
    min_year = django_filters.NumberFilter(field_name="year", lookup_expr="gte")
    max_year = django_filters.NumberFilter(field_name="year", lookup_expr="lte")

    class Meta:
        model = Car
        fields = {
            "brand": ["exact"],
            "fuel_type": ["exact"],
            "transmission": ["exact"],
            "body_type": ["exact"],
            "is_featured": ["exact"],
        }


class CarListView(generics.ListAPIView):
    """Public endpoint for listing active cars with search, filtering, and ordering."""

    serializer_class = CarListSerializer
    permission_classes = [permissions.AllowAny]
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_class = CarFilter
    search_fields = ["brand", "model", "persian_name", "description"]
    ordering_fields = ["display_order", "created_at", "year", "price"]
    ordering = ["display_order", "-created_at"]

    def get_queryset(self):
        return Car.objects.filter(is_active=True)


class CarFilterOptionsView(generics.GenericAPIView):
    """Returns distinct filter values for the car listing page."""

    permission_classes = [permissions.AllowAny]

    def get(self, request):
        qs = Car.objects.filter(is_active=True)
        return Response({
            "brands": list(qs.values_list("brand", flat=True).distinct().order_by("brand")),
            "body_types": list(qs.exclude(body_type="").values_list("body_type", flat=True).distinct().order_by("body_type")),
            "fuel_types": list(qs.values_list("fuel_type", flat=True).distinct().order_by("fuel_type")),
            "transmissions": list(qs.values_list("transmission", flat=True).distinct().order_by("transmission")),
            "min_year": qs.order_by("year").values_list("year", flat=True).first(),
            "max_year": qs.order_by("-year").values_list("year", flat=True).first(),
            "min_price": qs.exclude(price__isnull=True).order_by("price").values_list("price", flat=True).first(),
            "max_price": qs.exclude(price__isnull=True).order_by("-price").values_list("price", flat=True).first(),
        })


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
