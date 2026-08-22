from rest_framework import serializers
from .models import Branch


class BranchSerializer(serializers.ModelSerializer):
    """Serializer for branch."""
    class Meta:
        model = Branch
        fields = [
            'id', 'name', 'address', 'phone', 'map_url', 'map_image',
            'latitude', 'longitude', 'is_active', 'display_order',
        ]


class BranchAdminSerializer(serializers.ModelSerializer):
    """Serializer for admin branch management."""
    class Meta:
        model = Branch
        fields = '__all__'
