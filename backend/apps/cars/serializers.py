from rest_framework import serializers
from .models import Car


class CarListSerializer(serializers.ModelSerializer):
    """Serializer for car list view."""
    class Meta:
        model = Car
        fields = [
            'id', 'brand', 'model', 'persian_name', 'slug', 'year',
            'fuel_type', 'transmission', 'main_image', 'is_featured',
            'display_order', 'created_at',
        ]


class CarDetailSerializer(serializers.ModelSerializer):
    """Serializer for car detail view."""
    fuel_type_display = serializers.CharField(source='get_fuel_type_display', read_only=True)
    transmission_display = serializers.CharField(source='get_transmission_display', read_only=True)

    class Meta:
        model = Car
        fields = [
            'id', 'brand', 'model', 'persian_name', 'slug', 'description',
            'year', 'fuel_type', 'fuel_type_display', 'transmission',
            'transmission_display', 'engine', 'price', 'main_image',
            'gallery', 'is_active', 'is_featured', 'seo_title',
            'seo_description', 'og_image', 'created_at', 'updated_at',
        ]


class CarAdminSerializer(serializers.ModelSerializer):
    """Serializer for admin car management."""
    class Meta:
        model = Car
        fields = '__all__'
