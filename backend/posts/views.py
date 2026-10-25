from uuid import UUID

from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import CharField, Count, Exists, OuterRef, Subquery
from django.db.models.functions import Cast
from django.shortcuts import get_object_or_404
from rest_framework import serializers
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from note.models import Workout
from notifications.models import Notification
from .models import Posts, Like


class PageQuery(serializers.Serializer):
    limit = serializers.IntegerField(default=20, min_value=1, max_value=100)
    offset = serializers.IntegerField(default=0, min_value=0, max_value=2147483647)


class CreatePostSerializer(serializers.Serializer):
    post_type = serializers.ChoiceField(choices=[1, 2, 3])
    content = serializers.CharField(required=False, default="", allow_blank=True, max_length=2000)
    workout_id = serializers.UUIDField(required=False)

    def validate(self, attrs):
        if attrs["post_type"] in (1, 2) and not attrs["content"]:
            raise serializers.ValidationError({"content": "投稿内容を入力してください。"})
        if attrs["post_type"] == 2:
            if not attrs.get("workout_id") or not Workout.objects.filter(pk=attrs["workout_id"], user=self.context["request"].user).exists():
                raise serializers.ValidationError({"workout_id": "自分のトレーニング記録を指定してください。"})
        elif "workout_id" in attrs:
            raise serializers.ValidationError({"workout_id": "記録付き投稿でのみ指定できます。"})
        return attrs


def visible_posts(viewer):
    owners = get_user_model().objects.filter(is_active=True).annotate(public_id=Cast("pk", CharField())).filter(public_id=OuterRef("user_id"))
    return Posts.objects.annotate(
        user_name=Subquery(owners.values("user_name")[:1]),
        like_count=Count("like"),
        is_liked=Exists(Like.objects.filter(post_id=OuterRef("pk"), user_id=str(viewer.pk))),
    ).filter(user_name__isnull=False).order_by("-posted_at", "-post_id")


def representation(post):
    return {"post_id": str(post.pk), "user_id": post.user_id, "user_name": post.user_name,
            "post_type": post.post_type, "content": post.content, "posted_at": post.posted_at.isoformat(),
            "workout_id": post.workout_id, "like_count": post.like_count, "is_liked": post.is_liked}


def page(request, user_id=None):
    query = PageQuery(data=request.query_params)
    query.is_valid(raise_exception=True)
    limit, offset = query.validated_data["limit"], query.validated_data["offset"]
    rows = visible_posts(request.user)
    if user_id is not None:
        rows = rows.filter(user_id=user_id)
    results = list(rows[offset:offset + limit + 1])
    return Response({"results": [representation(post) for post in results[:limit]], "next_offset": offset + limit if len(results) > limit else None})


def uuid_or_404(value):
    from django.http import Http404
    try:
        return UUID(value)
    except (ValueError, TypeError, AttributeError):
        raise Http404


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def posts(request):
    if request.method == "GET":
        return page(request)
    serializer = CreatePostSerializer(data=request.data, context={"request": request})
    serializer.is_valid(raise_exception=True)
    values = serializer.validated_data
    post = Posts.objects.create(user_id=str(request.user.pk), post_type=values["post_type"], content=values["content"], workout_id=str(values["workout_id"]) if "workout_id" in values else None)
    return Response(representation(visible_posts(request.user).get(pk=post.pk)), status=201)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_user_posts(request, user_id):
    return page(request, user_id)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def post_detail(request, post_id):
    return Response(representation(get_object_or_404(visible_posts(request.user), pk=uuid_or_404(post_id))))


@api_view(["PUT"])
@permission_classes([IsAuthenticated])
def like_post(request, post_id):
    with transaction.atomic():
        # Lock the parent so the toggle and its notification commit together.
        post = get_object_or_404(Posts.objects.select_for_update(), pk=uuid_or_404(post_id))
        owner = get_object_or_404(get_user_model().objects.annotate(public_id=Cast("pk", CharField())), public_id=post.user_id, is_active=True)
        existing = Like.objects.filter(post_id=post, user_id=str(request.user.pk))
        if existing.exists():
            existing.delete()
            liked = False
        else:
            Like.objects.create(post_id=post, user_id=str(request.user.pk))
            liked = True
            if owner.pk != request.user.pk:
                # One alert per actor/post, even after unlike and re-like.
                Notification.objects.get_or_create(notification_type="post_liked", notifier=request.user, recipient=owner, post=post)
        return Response({"post_id": str(post.pk), "like_count": Like.objects.filter(post_id=post).count(), "is_liked": liked})
