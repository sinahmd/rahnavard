from django.urls import path

from . import views

urlpatterns = [
    # Public endpoints
    path("inquiries/", views.InquiryCreateView.as_view(), name="inquiry-create"),
    # Admin endpoints
    path(
        "admin/inquiries/",
        views.InquiryAdminListView.as_view(),
        name="admin-inquiry-list",
    ),
    path(
        "admin/inquiries/<int:pk>/",
        views.InquiryAdminDetailView.as_view(),
        name="admin-inquiry-detail",
    ),
    path(
        "admin/inquiries/<int:pk>/restore/",
        views.InquiryRestoreView.as_view(),
        name="admin-inquiry-restore",
    ),
]
