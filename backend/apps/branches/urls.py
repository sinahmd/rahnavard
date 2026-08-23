from django.urls import path

from . import views

urlpatterns = [
    # Public endpoints
    path("branches/", views.BranchListView.as_view(), name="branch-list"),
    # Admin endpoints
    path(
        "admin/branches/", views.BranchAdminListView.as_view(), name="admin-branch-list"
    ),
    path(
        "admin/branches/<int:pk>/",
        views.BranchAdminDetailView.as_view(),
        name="admin-branch-detail",
    ),
]
