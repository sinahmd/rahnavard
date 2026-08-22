from django.contrib import admin
from .models import Car


@admin.register(Car)
class CarAdmin(admin.ModelAdmin):
    list_display = ['brand', 'model', 'persian_name', 'year', 'is_active', 'is_featured', 'display_order']
    list_filter = ['brand', 'fuel_type', 'transmission', 'is_active', 'is_featured']
    search_fields = ['brand', 'model', 'persian_name', 'description']
    list_editable = ['is_active', 'is_featured', 'display_order']
    prepopulated_fields = {'slug': ('brand', 'model')}
    fieldsets = (
        ('اطلاعات اصلی', {
            'fields': ('brand', 'model', 'persian_name', 'slug', 'description', 'year')
        }),
        ('مشخصات فنی', {
            'fields': ('fuel_type', 'transmission', 'engine', 'price')
        }),
        ('تصاویر', {
            'fields': ('main_image', 'gallery')
        }),
        ('وضعیت', {
            'fields': ('is_active', 'is_featured', 'display_order')
        }),
        ('SEO', {
            'fields': ('seo_title', 'seo_description', 'og_image'),
            'classes': ('collapse',)
        }),
    )
