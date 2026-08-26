from django.urls import path

from . import views

urlpatterns = [
    # Public endpoints
    path("articles/", views.ArticleListView.as_view(), name="article-list"),
    path(
        "articles/<str:slug>/",
        views.ArticleDetailView.as_view(),
        name="article-detail",
    ),
    # Admin endpoints
    path(
        "admin/articles/",
        views.ArticleAdminListView.as_view(),
        name="admin-article-list",
    ),
    path(
        "admin/articles/<int:pk>/",
        views.ArticleAdminDetailView.as_view(),
        name="admin-article-detail",
    ),
]
