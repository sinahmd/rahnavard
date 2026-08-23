from rest_framework import generics, permissions, status
from rest_framework.response import Response

from .models import Inquiry
from .serializers import InquiryCreateSerializer, InquirySerializer


class InquiryCreateView(generics.CreateAPIView):
    """Public endpoint for creating inquiries."""

    serializer_class = InquiryCreateSerializer
    permission_classes = [permissions.AllowAny]

    def perform_create(self, serializer):
        # Get client IP
        x_forwarded_for = self.request.META.get("HTTP_X_FORWARDED_FOR")
        if x_forwarded_for:
            ip = x_forwarded_for.split(",")[0]
        else:
            ip = self.request.META.get("REMOTE_ADDR")

        serializer.save(
            ip_address=ip,
            user_agent=self.request.META.get("HTTP_USER_AGENT", ""),
        )


class InquiryAdminListView(generics.ListAPIView):
    """Admin endpoint for listing inquiries."""

    serializer_class = InquirySerializer
    queryset = Inquiry.objects.all()
    permission_classes = [permissions.IsAdminUser]


class InquiryAdminDetailView(generics.RetrieveUpdateAPIView):
    """Admin endpoint for inquiry detail and status update."""

    serializer_class = InquirySerializer
    queryset = Inquiry.objects.all()
    permission_classes = [permissions.IsAdminUser]
