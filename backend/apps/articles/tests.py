import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from .models import Article


@pytest.fixture
def published_article(db):
    """Create a published article."""
    return Article.objects.create(
        title='Test Article',
        slug='test-article',
        excerpt='Test excerpt',
        content='Test content',
        is_published=True,
        published_at=timezone.now()
    )


@pytest.fixture
def draft_article(db):
    """Create a draft article."""
    return Article.objects.create(
        title='Draft Article',
        slug='draft-article',
        excerpt='Draft excerpt',
        content='Draft content',
        is_published=False
    )


@pytest.fixture
def sample_articles(db):
    """Create multiple sample articles."""
    articles = []
    for i in range(5):
        article = Article.objects.create(
            title=f'Article {i}',
            slug=f'article-{i}',
            excerpt=f'Excerpt {i}',
            content=f'Content {i}',
            is_published=i < 3,  # First 3 are published
            published_at=timezone.now() if i < 3 else None
        )
        articles.append(article)
    return articles


@pytest.mark.django_db
class TestArticleModel:
    """Tests for Article model."""

    def test_create_article(self, published_article):
        """Test creating an article."""
        assert published_article.title == 'Test Article'
        assert published_article.is_published is True

    def test_str_representation(self, published_article):
        """Test string representation."""
        assert str(published_article) == 'Test Article'

    def test_auto_slug_generation(self, db):
        """Test automatic slug generation."""
        article = Article.objects.create(
            title='New Article',
            excerpt='Excerpt',
            content='Content'
        )
        assert article.slug is not None
        assert len(article.slug) > 0

    def test_ordering(self, sample_articles):
        """Test ordering by published_at."""
        articles = list(Article.objects.filter(is_published=True))
        # Should be ordered by published_at descending
        assert articles[0].published_at >= articles[1].published_at


@pytest.mark.django_db
class TestArticleListView:
    """Tests for Article list API endpoint."""

    def test_list_published_articles(self, api_client, sample_articles):
        """Test listing only published articles."""
        response = api_client.get('/api/v1/articles/')
        assert response.status_code == 200
        assert len(response.data['results']) == 3  # Only 3 are published

    def test_list_empty(self, api_client):
        """Test listing when no articles exist."""
        response = api_client.get('/api/v1/articles/')
        assert response.status_code == 200
        assert len(response.data['results']) == 0

    def test_search_articles(self, api_client, sample_articles):
        """Test searching articles."""
        response = api_client.get('/api/v1/articles/?search=Article 0')
        assert response.status_code == 200
        assert len(response.data['results']) >= 1


@pytest.mark.django_db
class TestArticleDetailView:
    """Tests for Article detail API endpoint."""

    def test_get_article_detail(self, api_client, published_article):
        """Test retrieving article detail."""
        response = api_client.get(f'/api/v1/articles/{published_article.slug}/')
        assert response.status_code == 200
        assert response.data['title'] == 'Test Article'
        assert response.data['content'] == 'Test content'

    def test_article_not_found(self, api_client):
        """Test 404 for non-existent article."""
        response = api_client.get('/api/v1/articles/non-existent/')
        assert response.status_code == 404

    def test_draft_article_not_accessible(self, api_client, draft_article):
        """Test that draft articles are not accessible."""
        response = api_client.get(f'/api/v1/articles/{draft_article.slug}/')
        assert response.status_code == 404


@pytest.mark.django_db
class TestArticleAdminAPI:
    """Tests for Article admin API endpoints."""

    def test_admin_list_requires_auth(self, api_client):
        """Test that admin list requires authentication."""
        response = api_client.get('/api/v1/admin/articles/')
        assert response.status_code == 401

    def test_admin_list_with_auth(self, admin_client, sample_articles):
        """Test admin list with authentication."""
        response = admin_client.get('/api/v1/admin/articles/')
        assert response.status_code == 200
        assert len(response.data['results']) == 5  # All articles

    def test_admin_create_article(self, admin_client):
        """Test creating an article via admin API."""
        data = {
            'title': 'New Article',
            'slug': 'new-article',
            'excerpt': 'New excerpt',
            'content': 'New content',
            'is_published': False
        }
        response = admin_client.post('/api/v1/admin/articles/', data, format='json')
        assert response.status_code == 201

    def test_admin_update_article(self, admin_client, published_article):
        """Test updating an article via admin API."""
        data = {'title': 'Updated Title'}
        response = admin_client.patch(
            f'/api/v1/admin/articles/{published_article.pk}/',
            data,
            format='json'
        )
        assert response.status_code == 200
        assert response.data['title'] == 'Updated Title'

    def test_admin_delete_article(self, admin_client, published_article):
        """Test deleting an article via admin API."""
        response = admin_client.delete(f'/api/v1/admin/articles/{published_article.pk}/')
        assert response.status_code == 204
        assert Article.objects.count() == 0
