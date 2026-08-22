from rest_framework import serializers
from .models import Inquiry


class InquiryCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating inquiries (public)."""
    class Meta:
        model = Inquiry
        fields = ['name', 'phone', 'subject', 'message']


class InquirySerializer(serializers.ModelSerializer):
    """Serializer for listing inquiries (admin)."""
    class Meta:
        model = Inquiry
        fields = '__all__'
        read_only_fields = ['id', 'ip_address', 'user_agent', 'created_at']
