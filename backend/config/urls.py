from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("api/", include("core.urls")),
    path("admin/", admin.site.urls),
    path("api/", include("posts.urls")),
    path("api/", include("note.urls")),
    path("api/", include("users.urls")),
]
