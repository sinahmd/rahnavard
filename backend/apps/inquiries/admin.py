from django.contrib import admin

from .models import Inquiry


@admin.register(Inquiry)
class InquiryAdmin(admin.ModelAdmin):
    list_display = ["name", "phone", "subject", "is_read", "is_contacted", "created_at"]
    list_filter = ["is_read", "is_contacted"]
    search_fields = ["name", "phone", "subject", "message"]
    list_editable = ["is_read", "is_contacted"]
    readonly_fields = ["ip_address", "user_agent", "created_at"]
