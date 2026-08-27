# Database Hardening — Implementation Plan

> **Purpose:** Fix critical database issues before production launch
> **Estimated Time:** 3-4 hours
> **Risk Level:** Medium (all changes are additive, no data loss)

---

## Priority Overview

| Priority | Task | Risk | Time | Dependencies |
|----------|------|------|------|--------------|
| P0 | Add soft delete to Car | Low | 30 min | None |
| P0 | Add soft delete to Article | Low | 20 min | None |
| P1 | Add missing database indexes | Low | 20 min | None |
| P1 | Remove IP/User-Agent storage (GDPR) | Medium | 15 min | None |
| P2 | Add soft delete to Branch | Low | 15 min | None |
| P2 | Add soft delete to Inquiry | Low | 15 min | None |
| P2 | Fix SiteSettings singleton pattern | Low | 20 min | None |
| P3 | Add audit logging | Medium | 45 min | P0 (soft delete) |
| P3 | Add database backup script | Low | 20 min | None |

**Total: ~3 hours**

---

## Phase 1: Soft Delete (P0) — Prevent Data Loss

### Why This First?
- **Without soft delete, clicking "Delete" in admin permanently removes data**
- This is the #1 risk for data loss in production
- All other changes are safe — this is the critical one

---

### Task 1.1: Create Soft Delete Mixin

**File:** `backend/apps/core/mixins.py` (NEW)

```python
"""
Reusable soft delete mixin for all models.
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
    
    Usage:
        class MyModel(SoftDeleteMixin):
            name = models.CharField(max_length=100)
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
```

**Why a mixin?**
- Write once, use everywhere
- Consistent behavior across all models
- Easy to add to new models later

---

### Task 1.2: Add Soft Delete to Car Model

**File:** `backend/apps/cars/models.py`

**Changes:**
```python
# Add import
from apps.core.mixins import SoftDeleteMixin

# Change class definition
class Car(SoftDeleteMixin, models.Model):  # Add SoftDeleteMixin
    # ... rest of model stays the same ...
    
    class Meta:
        verbose_name = "خودرو"
        verbose_name_plural = "خودروها"
        ordering = ["display_order", "-created_at"]
        indexes = [  # Add these (Task 2.1)
            models.Index(fields=['brand', 'is_active', 'is_deleted']),
            models.Index(fields=['year', 'is_active', 'is_deleted']),
            models.Index(fields=['is_featured', 'is_active', 'is_deleted']),
        ]
```

**Update views to respect soft delete:**

**File:** `backend/apps/cars/views.py`
```python
# No changes needed! The SoftDeleteManager automatically filters out
# soft-deleted records. Existing queries like:
#   Car.objects.filter(is_active=True)
# will now also exclude soft-deleted records automatically.
```

---

### Task 1.3: Add Soft Delete to Article Model

**File:** `backend/apps/articles/models.py`

**Changes:**
```python
# Add import
from apps.core.mixins import SoftDeleteMixin

# Change class definition
class Article(SoftDeleteMixin, models.Model):  # Add SoftDeleteMixin
    # ... rest of model stays the same ...
    
    class Meta:
        verbose_name = "مقاله"
        verbose_name_plural = "مقالات"
        ordering = ["-published_at"]
        indexes = [  # Add these (Task 2.2)
            models.Index(fields=['is_published', 'published_at', 'is_deleted']),
        ]
```

---

### Task 1.4: Add Soft Delete to Branch Model

**File:** `backend/apps/branches/models.py`

**Changes:**
```python
from apps.core.mixins import SoftDeleteMixin

class Branch(SoftDeleteMixin, models.Model):
    # ... existing fields ...
```

---

### Task 1.5: Add Soft Delete to Inquiry Model

**File:** `backend/apps/inquiries/models.py`

**Changes:**
```python
from apps.core.mixins import SoftDeleteMixin

class Inquiry(SoftDeleteMixin, models.Model):
    # ... existing fields ...
```

---

### Task 1.6: Create Migration

```bash
# Generate migration
cd backend
python manage.py makemigrations cars articles branches inquiries

# This creates migrations like:
# - cars/migrations/0003_car_is_deleted_car_deleted_at_and_more.py
# - articles/migrations/0003_article_is_deleted_article_deleted_at.py
# - etc.
```

---

## Phase 2: Database Indexes (P1) — Performance

### Why Second?
- Soft delete fields need indexes (Phase 1)
- These indexes prevent slow queries as data grows

---

### Task 2.1: Add Car Indexes

**File:** `backend/apps/cars/models.py`

```python
class Meta:
    indexes = [
        # Composite indexes for common queries
        models.Index(fields=['brand', 'is_active', 'is_deleted']),
        models.Index(fields=['year', 'is_active', 'is_deleted']),
        models.Index(fields=['is_featured', 'is_active', 'is_deleted']),
        models.Index(fields=['display_order', 'created_at']),
    ]
```

**Why these indexes?**
```sql
-- These queries are common in your views:
SELECT * FROM cars_car WHERE brand = 'Hyundai' AND is_active = TRUE AND is_deleted = FALSE;
SELECT * FROM cars_car WHERE year = 2024 AND is_active = TRUE;
SELECT * FROM cars_car WHERE is_featured = TRUE AND is_active = TRUE;
```

---

### Task 2.2: Add Article Indexes

**File:** `backend/apps/articles/models.py`

```python
class Meta:
    indexes = [
        models.Index(fields=['is_published', 'published_at', 'is_deleted']),
    ]
```

---

### Task 2.3: Add Inquiry Indexes

**File:** `backend/apps/inquiries/models.py`

```python
class Meta:
    indexes = [
        models.Index(fields=['is_read', 'created_at']),
        models.Index(fields=['is_contacted', 'created_at']),
    ]
```

---

## Phase 3: GDPR Compliance (P1) — Remove IP Storage

### Why Important?
- Storing IP addresses violates GDPR in EU
- User-Agent strings can fingerprint users
- This data isn't essential for your business

---

### Task 3.1: Remove IP and User-Agent from Inquiry

**File:** `backend/apps/inquiries/models.py`

```python
class Inquiry(SoftDeleteMixin, models.Model):
    name = models.CharField(max_length=200, verbose_name="نام")
    phone = models.CharField(max_length=20, verbose_name="تلفن")
    subject = models.CharField(max_length=300, blank=True, verbose_name="موضوع")
    message = models.TextField(blank=True, verbose_name="پیام")

    # Status
    is_read = models.BooleanField(default=False, verbose_name="خوانده شده")
    is_contacted = models.BooleanField(default=False, verbose_name="تماس گرفته شده")

    # REMOVED: ip_address field
    # REMOVED: user_agent field

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="تاریخ ایجاد")

    class Meta:
        verbose_name = "استعلام"
        verbose_name_plural = "استعلامات"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=['is_read', 'created_at']),
            models.Index(fields=['is_contacted', 'created_at']),
        ]
```

**File:** `backend/apps/inquiries/views.py`

```python
class InquiryCreateView(generics.CreateAPIView):
    """Public endpoint for creating inquiries."""

    serializer_class = InquiryCreateSerializer
    permission_classes = [permissions.AllowAny]

    def perform_create(self, serializer):
        # REMOVED: IP address collection
        # REMOVED: User-Agent collection
        serializer.save()
```

---

## Phase 4: SiteSettings Safety (P2)

### Why?
- Current singleton pattern risks data loss
- If pk=1 is deleted, all settings are lost

---

### Task 4.1: Add Safety Checks

**File:** `backend/apps/core/models.py`

```python
class SiteSettings(models.Model):
    """Singleton model for site-wide settings with safety checks."""

    # ... all existing fields ...

    class Meta:
        verbose_name = "Site Settings"
        verbose_name_plural = "Site Settings"

    def save(self, *args, **kwargs):
        # Ensure only one instance exists
        self.pk = 1
        
        # Safety: Prevent deletion by checking count
        if SiteSettings.objects.count() > 0 and not self.pk:
            raise ValueError("SiteSettings singleton already exists!")
        
        super().save(*args, **kwargs)

    @classmethod
    def load(cls):
        obj, created = cls.objects.get_or_create(pk=1)
        return obj

    def delete(self, *args, **kwargs):
        """Prevent deletion of singleton."""
        raise ValueError("Cannot delete SiteSettings singleton!")
```

---

## Phase 5: Audit Logging (P3)

### Why?
- Track who changed what and when
- Essential for debugging and compliance
- Helps recover from accidental changes

---

### Task 5.1: Create Audit Log Model

**File:** `backend/apps/core/models.py` (add to existing file)

```python
class AuditLog(models.Model):
    """Track all changes to important models."""

    ACTION_CHOICES = [
        ('CREATE', 'ایجاد'),
        ('UPDATE', 'بروزرسانی'),
        ('DELETE', 'حذف'),
        ('RESTORE', 'بازیابی'),
    ]

    user = models.ForeignKey(
        'auth.User',
        on_delete=models.SET_NULL,
        null=True,
        verbose_name="کاربر"
    )
    action = models.CharField(
        max_length=10,
        choices=ACTION_CHOICES,
        verbose_name="عملیات"
    )
    model_name = models.CharField(
        max_length=100,
        verbose_name="مدل"
    )
    object_id = models.IntegerField(
        verbose_name="شناسه رکورد"
    )
    object_repr = models.CharField(
        max_length=200,
        verbose_name="نمایش رکورد"
    )
    changes = models.JSONField(
        default=dict,
        verbose_name="تغییرات"
    )
    timestamp = models.DateTimeField(
        auto_now_add=True,
        verbose_name="زمان"
    )

    class Meta:
        verbose_name = "لاگ تغییرات"
        verbose_name_plural = "لاگ‌های تغییرات"
        ordering = ["-timestamp"]
        indexes = [
            models.Index(fields=['model_name', 'object_id']),
            models.Index(fields=['user', 'timestamp']),
        ]

    def __str__(self):
        return f"{self.user} - {self.action} {self.model_name} #{self.object_id}"
```

---

### Task 5.2: Create Audit Signal

**File:** `backend/apps/core/signals.py` (NEW)

```python
"""
Audit logging signals for tracking model changes.
"""
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.contrib.auth.models import User

from .models import AuditLog


def get_client_ip(request):
    """Get client IP from request."""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        return x_forwarded_for.split(',')[0]
    return request.META.get('REMOTE_ADDR')


def log_change(sender, instance, action, **kwargs):
    """Log a model change."""
    from threading import local
    _thread_locals = local()
    
    # Get user from thread local (set in middleware)
    user = getattr(_thread_locals, 'user', None)
    
    # Determine action type
    if action == 'post_save':
        action_type = 'CREATE' if kwargs.get('created') else 'UPDATE'
    elif action == 'post_delete':
        action_type = 'DELETE'
    else:
        return
    
    # Get changes (for updates)
    changes = {}
    if action_type == 'UPDATE' and hasattr(instance, '_old_values'):
        for field, old_value in instance._old_values.items():
            new_value = getattr(instance, field, None)
            if old_value != new_value:
                changes[field] = {'old': str(old_value), 'new': str(new_value)}
    
    AuditLog.objects.create(
        user=user,
        action=action_type,
        model_name=sender.__name__,
        object_id=instance.pk,
        object_repr=str(instance)[:200],
        changes=changes
    )
```

---

### Task 5.3: Connect Signals

**File:** `backend/apps/core/apps.py`

```python
from django.apps import AppConfig


class CoreConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.core'

    def ready(self):
        import apps.core.signals  # noqa
```

---

## Phase 6: Database Backup (P3)

### Task 6.1: Create Backup Script

**File:** `scripts/backup-db.sh` (NEW)

```bash
#!/bin/bash
# Database backup script for production
# Run daily via cron: 0 2 * * * /var/www/rahnavard/scripts/backup-db.sh

set -e

BACKUP_DIR="/var/www/rahnavard/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/rahnavard_$DATE.sql.gz"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Dump database
echo "📦 Creating backup..."
docker compose -f docker-compose.prod.yml exec -T postgres \
    pg_dump -U ${POSTGRES_USER:-rahnavard_user} ${POSTGRES_DB:-rahnavard} \
    | gzip > "$BACKUP_FILE"

# Keep only last 30 days
echo "🧹 Cleaning old backups..."
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +30 -delete

# Show status
echo "✅ Backup created: $BACKUP_FILE"
echo "📊 Size: $(du -h "$BACKUP_FILE" | cut -f1)"
ls -la "$BACKUP_DIR"/*.sql.gz | tail -5
```

---

## Migration Order

```
Phase 1: Soft Delete (P0)
    ↓
Phase 2: Indexes (P1)
    ↓
Phase 3: GDPR (P1)
    ↓
Phase 4: SiteSettings (P2)
    ↓
Phase 5: Audit Log (P3)
    ↓
Phase 6: Backup (P3)
```

**Why this order?**
1. Soft delete first = prevents data loss immediately
2. Indexes second = need soft delete fields for composite indexes
3. GDPR third = removes sensitive data
4. SiteSettings fourth = low risk improvement
5. Audit log fifth = needs soft delete to track restore actions
6. Backup last = safety net for everything above

---

## Testing Checklist

After each phase, verify:

```bash
# Backend checks
cd backend
python manage.py check
python manage.py makemigrations --check
python manage.py test

# Docker rebuild
docker compose down
docker compose up --build -d

# Manual verification
curl http://localhost:8000/api/v1/cars/
curl http://localhost:8000/api/v1/articles/
```

---

## Rollback Plan

If something goes wrong:

```bash
# 1. Revert code changes
git checkout HEAD~1 -- backend/apps/*/models.py

# 2. Remove migrations
rm backend/apps/*/migrations/000X_*.py

# 3. Rebuild
docker compose down
docker compose up --build -d
```

---

## Success Criteria

After implementation:

- [ ] All models have soft delete capability
- [ ] All critical queries have database indexes
- [ ] No IP addresses stored (GDPR compliant)
- [ ] SiteSettings cannot be accidentally deleted
- [ ] All changes are logged in AuditLog
- [ ] Daily backups are configured
- [ ] All tests pass
- [ ] No breaking changes to existing API

---

*Last updated: 2026-08-27*
