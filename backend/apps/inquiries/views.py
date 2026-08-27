from rest_framework import generics, permissions, status
from rest_framework.response import Response

from .models import Inquiry
from .serializers import InquiryCreateSerializer, InquirySerializer


class InquiryCreateView(generics.CreateAPIView):
    """Public endpoint for creating inquiries."""

    serializer_class = InquiryCreateSerializer
    permission_classes = [permissions.AllowAny]

    # Note: IP address and User-Agent are NOT stored for GDPR compliance.
    # See DEVELOPMENT.md section 11 for details.


class InquiryAdminListView(generics.ListAPIView):
    """Admin endpoint for listing inquiries."""

    serializer_class = InquirySerializer
    permission_classes = [permissions.IsAdminUser]

    def get_queryset(self):
        """Include soft-deleted items in admin."""
        return Inquiry.objects.with_deleted()


class InquiryAdminDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Admin endpoint for inquiry detail, update, and delete."""

    serializer_class = InquirySerializer
    permission_classes = [permissions.IsAdminUser]

    def get_queryset(self):
        """Include soft-deleted items in admin."""
        return Inquiry.objects.with_deleted()

    def perform_destroy(self, instance):
        """Soft delete instead of hard delete."""
        instance.soft_delete()
