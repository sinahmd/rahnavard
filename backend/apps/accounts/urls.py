from django.urls import path
from . import views

app_name = 'accounts'

urlpatterns = [
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    path('user/', views.current_user_view, name='current-user'),
    path('change-password/', views.change_password_view, name='change-password'),
    path('users/', views.user_list_view, name='user-list'),
]
