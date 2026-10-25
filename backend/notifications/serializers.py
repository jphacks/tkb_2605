from rest_framework import serializers

from .models import Notification


class NotificationQuerySerializer(serializers.Serializer):
    limit = serializers.IntegerField(default=20, min_value=1, max_value=100)


class NotificationSerializer(serializers.ModelSerializer):
    notifier_id = serializers.IntegerField(read_only=True)
    notifier_name = serializers.CharField(source="notifier.user_name", read_only=True)

    class Meta:
        model = Notification
        fields = [
            "notification_id",
            "notifier_id",
            "notifier_name",
            "notified_at",
        ]
        read_only_fields = fields
