from django.urls import path

from . import views, profile_views


urlpatterns = [
    path("users/", profile_views.user_list, name="user-list"),
    path("users/me/profile/", profile_views.own_profile, name="own-profile"),
    path("users/<int:user_id>/profile/", profile_views.profile, name="user-profile"),
    path("users/<int:user_id>/masmate/", profile_views.become_masmates, name="become-masmates"),
    path("auth/register/", views.register, name="register"),
    path("auth/csrf/", views.csrf, name="csrf"),
    path("auth/login/", views.login, name="login"),
    path("users/me/", views.me, name="me"),
    path("auth/logout/", views.logout, name="logout"),
]