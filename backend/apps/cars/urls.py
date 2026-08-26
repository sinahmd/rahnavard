from django.urls import path

from . import views

urlpatterns = [
    # Public endpoints
    path("cars/", views.CarListView.as_view(), name="car-list"),
    path("cars/<str:slug>/", views.CarDetailView.as_view(), name="car-detail"),
    # Admin endpoints
    path("admin/cars/", views.CarAdminListView.as_view(), name="admin-car-list"),
    path(
        "admin/cars/<int:pk>/",
        views.CarAdminDetailView.as_view(),
        name="admin-car-detail",
    ),
]
