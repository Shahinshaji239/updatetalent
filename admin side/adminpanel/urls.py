# admin side/adminpanel/urls.py

from django.urls import path, include  # <-- Make sure to import "include"
from adminside import views
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    # URLs for your Django Admin templates
    path('', views.login, name='login'),
    path('dashboard/', views.admin_dashboard, name='dashboard'),
    path('toggle-user/<int:user_id>/', views.toggle_user_block, name='admin-toggle-user'),
    path('admin-logout/', views.admin_logout, name='admin_logout'),

    # NEW: All API traffic goes here
    path('api/', include('adminside.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)