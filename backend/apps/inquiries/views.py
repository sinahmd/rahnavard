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


class InquiryRestoreView(generics.GenericAPIView):
    """Admin endpoint to restore a soft-deleted inquiry."""

    serializer_class = InquirySerializer
    permission_classes = [permissions.IsAdminUser]

    def get_queryset(self):
        return Inquiry.objects.with_deleted()

    def post(self, request, pk=None):
        instance = self.get_object()
        if not instance.is_deleted:
            return Response(
                {'detail': 'This inquiry is not soft-deleted.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        instance.restore()
        serializer = self.get_serializer(instance)
        return Response(serializer.data, status=status.HTTP_200_OK)
