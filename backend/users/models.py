from django.contrib.auth.models import AbstractUser
from django.db import models
from .managers import UserManager

AVATAR_COLORS = [(color, color) for color in ("#f0d9d1", "#f3dfcc", "#e7dff0", "#dce9ee")]


class User(AbstractUser):
    email = models.EmailField(unique=True)
    user_name = models.CharField(max_length=50)
    bio = models.CharField(max_length=160, blank=True, default="")
    avatar_color = models.CharField(max_length=7, choices=AVATAR_COLORS, default="#f0d9d1")
    USERNAME_FIELD = "email"
    username = None
    REQUIRED_FIELDS = ["user_name"]
    objects = UserManager()


class Masmate(models.Model):
    first = models.ForeignKey(User, on_delete=models.CASCADE, related_name="masmate_first")
    second = models.ForeignKey(User, on_delete=models.CASCADE, related_name="masmate_second")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["first", "second"], name="unique_masmate_pair"),
            models.CheckConstraint(condition=models.Q(first__lt=models.F("second")), name="ordered_masmate_pair"),
        ]
