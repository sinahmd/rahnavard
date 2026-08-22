from django.contrib import admin
from .models import Article


@admin.register(Article)
class ArticleAdmin(admin.ModelAdmin):
    list_display = ['title', 'is_published', 'published_at', 'created_at']
    list_filter = ['is_published']
    search_fields = ['title', 'excerpt', 'content']
    list_editable = ['is_published']
    prepopulated_fields = {'slug': ('title',)}
    fieldsets = (
        ('محتوا', {
            'fields': ('title', 'slug', 'excerpt', 'content', 'cover_image')
        }),
        ('وضعیت', {
            'fields': ('is_published', 'published_at')
        }),
        ('SEO', {
            'fields': ('seo_title', 'seo_description', 'og_image'),
            'classes': ('collapse',)
        }),
    )
