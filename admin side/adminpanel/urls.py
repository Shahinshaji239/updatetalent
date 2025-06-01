from django.urls import path
from adminside import views
from django.conf import settings
from django.conf.urls.static import static




urlpatterns = [
    path('', views.login, name='login'),
    path('dashboard/', views.admin_dashboard, name='dashboard'),
    path('toggle-user/<int:user_id>/', views.toggle_user_block, name='admin-toggle-user'),
    path('admin-logout/', views.admin_logout, name='admin_logout'),




#api urls
      path('signup/', views.signup, name='signup'),
      path('login/', views.loginapi, name='loginapi'),
      path('add-candidate/', views.add_candidate, name='add_candidate'),
      path('candidates/', views.get_candidates, name='get_candidates'),
      path('candidates/<int:candidate_id>/', views.get_candidate_detail, name='candidate_detail'),
      path('candidates/<int:candidate_id>/delete/', views.delete_candidate, name='delete_candidate'),
      path('update_candidate/<int:candidate_id>/', views.update_candidate, name='update_candidate'),
      path('candidates/search/', views.search_candidates, name='search_candidates'),
      path('logout/', views.logout, name='logout'),
      path('profile/', views.get_user_profile, name='get_user_profile'),
      path('bulk-import-excel/', views.bulk_import_excel, name='bulk_import_candidates'),
      path('candidates/export/', views.export_candidates_excel, name='export_candidates_excel'),
      path('verify-email/', views.verify_email, name='verify_email'),
      path('resend-verification/', views.resend_verification_code, name='resend_verification_email'),
      path('request-reset/', views.request_password_reset, name='request_password_reset'), # Corrected
      path('reset-password/', views.confirm_password_reset, name='confirm_password_reset'), # New view for actual reset


]
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
