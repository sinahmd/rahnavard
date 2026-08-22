from rest_framework import generics, filters
from django_filters.rest_framework import DjangoFilterBackend
from .models import Article
from .serializers import ArticleListSerializer, ArticleDetailSerializer, ArticleAdminSerializer


class ArticleListView(generics.ListAPIView):
    """Public endpoint for listing published articles."""
    serializer_class = ArticleListSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'excerpt', 'content']
    ordering_fields = ['published_at', 'created_at']

    def get_queryset(self):
        return Article.objects.filter(is_published=True)


class ArticleDetailView(generics.RetrieveAPIView):
    """Public endpoint for article detail."""
    serializer_class = ArticleDetailSerializer
    lookup_field = 'slug'

    def get_queryset(self):
        return Article.objects.filter(is_published=True)


class ArticleAdminListView(generics.ListCreateAPIView):
    """Admin endpoint for listing and creating articles."""
    serializer_class = ArticleAdminSerializer
    queryset = Article.objects.all()
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['is_published']
    search_fields = ['title', 'excerpt']


class ArticleAdminDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Admin endpoint for article detail, update, and delete."""
    serializer_class = ArticleAdminSerializer
    queryset = Article.objects.all()
