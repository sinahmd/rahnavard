from django.contrib import admin
from django.utils.html import format_html

from .models import Car


@admin.register(Car)
class CarAdmin(admin.ModelAdmin):
    list_display = [
        "brand",
        "model",
        "persian_name",
        "year",
        "is_active",
        "is_featured",
        "display_order",
        "deleted_status",
    ]
    list_filter = ["brand", "fuel_type", "transmission", "is_active", "is_featured", "is_deleted"]
    search_fields = ["brand", "model", "persian_name", "description"]
    list_editable = ["is_active", "is_featured", "display_order"]
    prepopulated_fields = {"slug": ("brand", "model")}
    actions = ["restore_selected", "soft_delete_selected"]
    fieldsets = (
        (
            "اطلاعات اصلی",
            {
                "fields": (
                    "brand",
                    "model",
                    "persian_name",
                    "slug",
                    "description",
                    "year",
                )
            },
        ),
        ("مشخصات فنی", {"fields": ("fuel_type", "transmission", "engine", "price")}),
        ("تصاویر", {"fields": ("main_image", "gallery")}),
        ("وضعیت", {"fields": ("is_active", "is_featured", "display_order")}),
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

    def get_actions(self, request):
        """Remove Django's default 'Delete selected' action to prevent hard deletes."""
        actions = super().get_actions(request)
        if 'delete_selected' in actions:
            del actions['delete_selected']
        return actions

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
