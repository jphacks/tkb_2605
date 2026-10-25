from django.urls import path

from . import views

urlpatterns = [
    path("posts/<str:post_id>/", views.post_detail, name="post-detail"),
    path("posts/", views.posts, name="posts"),
    path(
        "users/<str:user_id>/posts/",
        views.get_user_posts,
        name="get_user_posts",
    ),
    path(
        "posts/<str:post_id>/like/",
        views.like_post,
        name="like_post",
    ),
]
