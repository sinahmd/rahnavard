from django.contrib import admin
from django.utils.html import format_html

from .models import Article


@admin.register(Article)
class ArticleAdmin(admin.ModelAdmin):
    list_display = ["title", "is_published", "published_at", "created_at", "deleted_status"]
    list_filter = ["is_published", "is_deleted"]
    search_fields = ["title", "excerpt", "content"]
    list_editable = ["is_published"]
    prepopulated_fields = {"slug": ("title",)}
    actions = ["restore_selected", "soft_delete_selected"]
    fieldsets = (
        ("محتوا", {"fields": ("title", "slug", "excerpt", "content", "cover_image")}),
        ("وضعیت", {"fields": ("is_published", "published_at")}),
        (
            "SEO",
            {
                "fields": ("seo_title", "seo_description", "og_image"),
                "classes": ("collapse",),
            },
        ),
    )

    def get_queryset(self, request):
        """Include soft-deleted items in admin."""
        return self.model.objects.with_deleted()

    def deleted_status(self, obj):
        """Show delete status with color."""
        if obj.is_deleted:
            return format_html('<span style="color: red;">🗑️ حذف شده</span>')
        return format_html('<span style="color: green;">✅ فعال</span>')
    deleted_status.short_description = "وضعیت حذف"

    @admin.action(description="بازیابی آیتم‌های انتخاب شده")
    def restore_selected(self, request, queryset):
        """Restore soft-deleted items."""
        count = 0
        for obj in queryset:
            if obj.is_deleted:
                obj.restore()
                count += 1
        self.message_user(request, f"{count} آیتم بازیابی شد.")

    @admin.action(description="حذف نرم آیتم‌های انتخاب شده")
    def soft_delete_selected(self, request, queryset):
        """Soft delete items."""
        count = 0
        for obj in queryset:
            if not obj.is_deleted:
                obj.soft_delete()
                count += 1
        self.message_user(request, f"{count} آیتم حذف نرم شد.")
