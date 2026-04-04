from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from lostfound.views.auth_views import LoginView, RegisterView, ProfileView, LogoutView

urlpatterns = [
    path('login/',    LoginView.as_view(),        name='login'),
    path('register/', RegisterView.as_view(),     name='register'),
    path('refresh/',  TokenRefreshView.as_view(), name='token_refresh'),
    path('profile/',  ProfileView.as_view(),      name='profile'),
    path('logout/',   LogoutView.as_view(),        name='logout'),
]
