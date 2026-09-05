"""
Tests for the admin dashboard stats endpoint (GET /api/v1/admin/stats/).

The endpoint returns one JSON object of aggregate counts: active cars,
published articles, active branches, and total inquiries (the same queryset
the admin inquiries list shows, so its pagination total matches the card).
"""

import pytest
from rest_framework.test import APIClient

from apps.articles.models import Article
from apps.branches.models import Branch
from apps.cars.models import Car
from apps.inquiries.models import Inquiry


@pytest.fixture
def stats_dataset(db):
    """Mixed rows so every count is non-trivial and independently verifiable."""
    # 5 cars: 3 active (one soft-deleted active), 2 inactive
    for i in range(3):
        Car.objects.create(
            brand=f"Active{i}",
            model="Model",
            persian_name=f"فعال {i}",
            slug=f"active-{i}",
            year=2025,
            fuel_type="gasoline",
            transmission="automatic",
            is_active=True,
            main_image="cars/active.jpg",
        )
    Car.objects.create(
        brand="DeletedActive",
        model="Model",
        persian_name="حذف شده فعال",
        slug="deleted-active",
        year=2025,
        fuel_type="gasoline",
        transmission="automatic",
        is_active=True,
        main_image="cars/deleted.jpg",
    ).soft_delete()
    for i in range(2):
        Car.objects.create(
            brand=f"Inactive{i}",
            model="Model",
            persian_name=f"غیرفعال {i}",
            slug=f"inactive-{i}",
            year=2025,
            fuel_type="gasoline",
            transmission="automatic",
            is_active=False,
            main_image="cars/inactive.jpg",
        )
    # 4 articles: 3 published (one soft-deleted), 1 draft
    for i in range(3):
        Article.objects.create(
            title=f"منتشر شده {i}",
            slug=f"published-{i}",
            content="محتوا",
            is_published=True,
        )
    Article.objects.create(
        title="حذف شده منتشر", slug="deleted-published", content="محتوا", is_published=True
    ).soft_delete()
    Article.objects.create(
        title="پیش نویس", slug="draft", content="محتوا", is_published=False
    )
    # 4 branches: 3 active, 1 inactive
    for i in range(3):
        Branch.objects.create(
            name=f"شعبه {i}",
            address=f"آدرس {i}",
            phone="09110000000",
            map_url="https://neshan.ir/",
            map_image="branches/map.jpg",
            is_active=True,
        )
    Branch.objects.create(
        name="شعبه غیرفعال",
        address="آدرس",
        phone="09110000000",
        map_url="https://neshan.ir/",
        map_image="branches/map.jpg",
        is_active=False,
    )
    # 6 inquiries: one soft-deleted (admin list still counts it)
    for i in range(6):
        Inquiry.objects.create(name=f"کاربر {i}", phone="09110000000")
    Inquiry.objects.filter(phone="09110000000").first().soft_delete()


@pytest.mark.django_db
class TestAdminStatsEndpoint:
    """Tests for GET /api/v1/admin/stats/."""

    def test_requires_staff(self, db, admin_client, stats_dataset):
        """Anonymous and non-staff users are forbidden; staff can read it."""
        # Fresh clients: the conftest authenticated_client/admin_client share one
        # underlying APIClient (last force_authenticate wins), so build separate
        # ones here to test each role independently.
        anon_client = APIClient()
        assert anon_client.get("/api/v1/admin/stats/").status_code in (401, 403)

        from django.contrib.auth.models import User

        plain = User.objects.create_user(username="plain", password="x")
        user_client = APIClient()
        user_client.force_authenticate(user=plain)
        assert user_client.get("/api/v1/admin/stats/").status_code == 403

        assert admin_client.get("/api/v1/admin/stats/").status_code == 200

    def test_counts_are_accurate(self, admin_client, stats_dataset):
        """Each card count matches the row semantics (soft-deleted excluded)."""
        response = admin_client.get("/api/v1/admin/stats/")
        assert response.status_code == 200
        data = response.json()
        # 3 active + 2 inactive + 1 soft-deleted-active + 1 soft-deleted-inactive-ish
        # → active non-deleted: 3
        assert data["cars"] == 3
        # 3 published non-deleted
        assert data["articles"] == 3
        # 3 active branches
        assert data["branches"] == 3
        # 6 inquiries total, including the soft-deleted one (admin list parity)
        assert data["inquiries"] == 6

    def test_empty_database_returns_zeros(self, admin_client):
        """A fresh database reports zeros, never an error."""
        response = admin_client.get("/api/v1/admin/stats/")
        assert response.status_code == 200
        assert response.json() == {
            "cars": 0,
            "articles": 0,
            "branches": 0,
            "inquiries": 0,
        }
