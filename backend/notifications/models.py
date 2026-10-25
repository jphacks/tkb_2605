from django.conf import settings
from django.db import models


class Notification(models.Model):
    notification_id = models.BigAutoField(primary_key=True)
    notifier = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    notification_type = models.CharField(max_length=20, default="workout_started", choices=[("workout_started", "Workout started"), ("post_liked", "Post liked")])
    recipient = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.CASCADE, related_name="received_like_notifications")
    post = models.ForeignKey("posts.Posts", null=True, blank=True, on_delete=models.CASCADE, related_name="like_notifications")
    notified_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "notifications"
        ordering = ["-notified_at", "-notification_id"]
        constraints = [
            models.CheckConstraint(condition=(models.Q(notification_type="workout_started", recipient__isnull=True, post__isnull=True) | models.Q(notification_type="post_liked", recipient__isnull=False, post__isnull=False)), name="valid_notification_target"),
            models.UniqueConstraint(fields=["notifier", "recipient", "post"], condition=models.Q(notification_type="post_liked"), name="unique_post_like_notification"),
        ]
        indexes = [
            models.Index(
                fields=["-notified_at", "-notification_id"],
                name="notifications_latest_idx",
            ),
        ]


class NotificationCursor(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        primary_key=True,
        related_name="notification_cursor",
    )
    last_notification_id = models.PositiveBigIntegerField(default=0)

    class Meta:
        db_table = "notification_cursors"
