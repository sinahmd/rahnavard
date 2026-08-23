from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, generics, permissions

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
    queryset = Article.objects.all()
    permission_classes = [permissions.IsAdminUser]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ["is_published"]
    search_fields = ["title", "excerpt"]


class ArticleAdminDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Admin endpoint for article detail, update, and delete."""

    serializer_class = ArticleAdminSerializer
    queryset = Article.objects.all()
    permission_classes = [permissions.IsAdminUser]
