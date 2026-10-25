import uuid
from django.contrib.auth.models import AbstractUser
from django.db import models
from .managers import UserManager


class User(AbstractUser):
    # ログインに使うメールアドレスはユニーク
    email = models.EmailField(unique=True)
    # アプリに表示する名前
    user_name = models.CharField(max_length=50)
    # ログインに使う項目
    USERNAME_FIELD = "email"
    username = None
    REQUIRED_FIELDS = ["user_name"]
    objects = UserManager()
    
    