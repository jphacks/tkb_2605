import uuid
from django.db import models, migrations
from django.conf import settings


class Posts(models.Model):
    
    post_id = models.UUIDField(
        primary_key = True,
        default = uuid.uuid4,
        editable = False,    
    )
    
    # あとでForeignKeyに変更する
    user_id = user_id = models.CharField(max_length=100)
    post_type = models.IntegerField()
    content = models.TextField()
    posted_at = models.DateTimeField(auto_now_add=True)
    workout_id = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        default=None,
    )


class Like(models.Model):
    
    post_id = models.ForeignKey(
        Posts,
        on_delete=models.CASCADE,
    )
    
    # あとでForeignKeyに変更する
    user_id = models.CharField(max_length=100)
    