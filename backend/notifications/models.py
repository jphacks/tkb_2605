from django.conf import settings
from django.db import models


class Notification(models.Model):
    notification_id = models.BigAutoField(primary_key=True)
    notifier = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    notified_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "notifications"
        ordering = ["-notified_at", "-notification_id"]
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
