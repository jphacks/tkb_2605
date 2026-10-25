from django.urls import path

from . import views


urlpatterns = [
    path("auth/register/", views.register, name="register"),
    path("auth/csrf/", views.csrf, name="csrf"),
    path("auth/login/", views.login, name="login"),
    path("users/me/", views.me, name="me"),
    path("auth/logout/", views.logout, name="logout"),
]