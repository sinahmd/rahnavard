from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, generics, permissions, status
from rest_framework.response import Response

from apps.core.pagination import StandardResultsPagination
from .models import Article
from .serializers import (
    ArticleAdminSerializer,
    ArticleDetailSerializer,
    ArticleListSerializer,
)


class ArticleListView(generics.ListAPIView):
    """Public endpoint for listing published articles."""

    serializer_class = ArticleListSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = StandardResultsPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["title", "excerpt", "content"]
    ordering_fields = ["published_at", "created_at"]

    def get_queryset(self):
        return Article.objects.filter(is_published=True)


class ArticleDetailView(generics.RetrieveAPIView):
    """Public endpoint for article detail."""

    serializer_class = ArticleDetailSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = "slug"

    def get_queryset(self):
        return Article.objects.filter(is_published=True)


class ArticleAdminListView(generics.ListCreateAPIView):
    """Admin endpoint for listing and creating articles."""

    serializer_class = ArticleAdminSerializer
    permission_classes = [permissions.IsAdminUser]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ["is_published"]
    search_fields = ["title", "excerpt"]

    def get_queryset(self):
        """Include soft-deleted items in admin."""
        return Article.objects.with_deleted()


class ArticleAdminDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Admin endpoint for article detail, update, and delete."""

    serializer_class = ArticleAdminSerializer
    permission_classes = [permissions.IsAdminUser]

    def get_queryset(self):
        """Include soft-deleted items in admin."""
        return Article.objects.with_deleted()

    def perform_destroy(self, instance):
        """Soft delete instead of hard delete."""
        instance.soft_delete()


class ArticleRestoreView(generics.GenericAPIView):
    """Admin endpoint to restore a soft-deleted article."""

    serializer_class = ArticleAdminSerializer
    permission_classes = [permissions.IsAdminUser]

    def get_queryset(self):
        return Article.objects.with_deleted()

    def post(self, request, pk=None):
        instance = self.get_object()
        if not instance.is_deleted:
            return Response(
                {'detail': 'This article is not soft-deleted.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        instance.restore()
        serializer = self.get_serializer(instance)
        return Response(serializer.data, status=status.HTTP_200_OK)
