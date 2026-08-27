from django.contrib import admin
from django.utils.html import format_html

from .models import Inquiry


@admin.register(Inquiry)
class InquiryAdmin(admin.ModelAdmin):
    list_display = ["name", "phone", "subject", "is_read", "is_contacted", "created_at", "deleted_status"]
    list_filter = ["is_read", "is_contacted", "is_deleted"]
    search_fields = ["name", "phone", "subject", "message"]
    list_editable = ["is_read", "is_contacted"]
    readonly_fields = ["created_at"]
    actions = ["restore_selected", "soft_delete_selected"]

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
