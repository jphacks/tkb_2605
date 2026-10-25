from django.db import transaction
from django.db.models import Max
from rest_framework.authentication import SessionAuthentication
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Notification, NotificationCursor
from .serializers import NotificationQuerySerializer, NotificationSerializer


@api_view(["GET", "POST"])
@authentication_classes([SessionAuthentication])
@permission_classes([IsAuthenticated])
def notifications(request):
    if request.method == "POST":
        Notification.objects.create(notifier=request.user)
        return Response({})

    query = NotificationQuerySerializer(data=request.query_params.dict())
    query.is_valid(raise_exception=True)
    with transaction.atomic():
        cursor, _ = NotificationCursor.objects.select_for_update().get_or_create(
            user=request.user
        )
        latest_id = Notification.objects.aggregate(latest_id=Max("notification_id"))[
            "latest_id"
        ]
        notifications = (
            Notification.objects.exclude(notifier_id=request.user.pk)
            .filter(notification_id__gt=cursor.last_notification_id)
            .select_related("notifier")[:query.validated_data["limit"]]
        )
        data = NotificationSerializer(notifications, many=True).data
        if latest_id is not None and latest_id > cursor.last_notification_id:
            cursor.last_notification_id = latest_id
            cursor.save(update_fields=["last_notification_id"])
    return Response(data)
