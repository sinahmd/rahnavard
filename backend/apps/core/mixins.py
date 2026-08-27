"""
Reusable soft delete mixin for all models.

Usage:
    from apps.core.mixins import SoftDeleteMixin

    class MyModel(SoftDeleteMixin, models.Model):
        name = models.CharField(max_length=100)
"""
from django.db import models
from django.utils import timezone


class SoftDeleteManager(models.Manager):
    """Manager that excludes soft-deleted records by default."""

    def get_queryset(self):
        return super().get_queryset().filter(is_deleted=False)

    def with_deleted(self):
        """Include soft-deleted records."""
        return super().get_queryset()

    def deleted_only(self):
        """Only soft-deleted records."""
        return super().get_queryset().filter(is_deleted=True)


class SoftDeleteMixin(models.Model):
    """
    Mixin that adds soft delete capability to any model.

    Fields added:
        - is_deleted: Boolean flag for soft delete
        - deleted_at: Timestamp of when record was soft deleted

    Methods:
        - soft_delete(): Mark as deleted without removing from database
        - restore(): Restore a soft-deleted record
        - hard_delete(): Permanently delete (use with caution!)
    """

    is_deleted = models.BooleanField(
        default=False,
        db_index=True,
        verbose_name="حذف شده"
    )
    deleted_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="تاریخ حذف"
    )

    objects = SoftDeleteManager()

    class Meta:
        abstract = True

    def soft_delete(self):
        """Mark as deleted without removing from database."""
        self.is_deleted = True
        self.deleted_at = timezone.now()
        self.save(update_fields=['is_deleted', 'deleted_at'])

    def restore(self):
        """Restore a soft-deleted record."""
        self.is_deleted = False
        self.deleted_at = None
        self.save(update_fields=['is_deleted', 'deleted_at'])

    def hard_delete(self):
        """Permanently delete (use with caution!)."""
        super().delete()
