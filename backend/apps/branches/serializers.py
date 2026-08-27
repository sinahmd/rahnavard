from rest_framework import serializers

from apps.core.validators import ImageValidator
from .models import Branch


class BranchSerializer(serializers.ModelSerializer):
    """Serializer for branch."""

    class Meta:
        model = Branch
        fields = [
            "id",
            "name",
            "address",
            "phone",
            "map_url",
            "map_image",
            "latitude",
            "longitude",
            "is_active",
            "display_order",
        ]


class BranchAdminSerializer(serializers.ModelSerializer):
    """Serializer for admin branch management."""

    class Meta:
        model = Branch
        fields = [
            "id",
            "name",
            "address",
            "phone",
            "map_url",
            "map_image",
            "latitude",
            "longitude",
            "is_active",
            "display_order",
            "is_deleted",
            "deleted_at",
        ]
        read_only_fields = ["deleted_at"]
        extra_kwargs = {
            "map_image": {"validators": [ImageValidator()]},
        }
