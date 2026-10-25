from django.db.models import Exists, OuterRef, Q
from django.shortcuts import get_object_or_404
from rest_framework import serializers, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Masmate, User


class ProfileUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["user_name", "bio", "avatar_color"]
        extra_kwargs = {"user_name": {"allow_blank": False}}

    def to_internal_value(self, data):
        if not isinstance(data, dict) or not data or set(data) - set(self.fields):
            raise serializers.ValidationError({"non_field_errors": ["名前・自己紹介・アイコン色を指定してください。"]})
        return super().to_internal_value(data)


def profiles(viewer):
    relation = Masmate.objects.filter(
        Q(first_id=viewer.pk, second_id=OuterRef("pk"))
        | Q(second_id=viewer.pk, first_id=OuterRef("pk"))
    )
    return User.objects.filter(is_active=True).annotate(is_masmate=Exists(relation))


def public_profile(user):
    return {
        "user_id": str(user.pk), "user_name": user.user_name,
        "bio": user.bio, "avatar_color": user.avatar_color,
        "is_masmate": bool(getattr(user, "is_masmate", False)),
    }


@api_view(["GET", "PATCH"])
@permission_classes([IsAuthenticated])
def own_profile(request):
    if request.method == "PATCH":
        serializer = ProfileUpdateSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
    return Response(public_profile(request.user))


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def profile(request, user_id):
    return Response(public_profile(get_object_or_404(profiles(request.user), pk=user_id)))


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def user_list(request):
    query = request.query_params.get("q", "").strip()
    only_masmates = request.query_params.get("masmates", "false")
    try:
        raw_limit = request.query_params.get("limit", "20")
        raw_offset = request.query_params.get("offset", "0")
        if not raw_limit.isascii() or not raw_limit.isdigit() or not raw_offset.isascii() or not raw_offset.isdigit():
            raise ValueError
        limit, offset = int(raw_limit), int(raw_offset)
        if not 1 <= limit <= 100 or offset > 2147483647 or len(query) > 50 or only_masmates not in ("true", "false"):
            raise ValueError
    except ValueError:
        return Response({"detail": "検索条件・取得範囲を確認してください。"}, status=400)
    users = profiles(request.user).exclude(pk=request.user.pk)
    if query:
        users = users.filter(user_name__icontains=query)
    if only_masmates == "true":
        users = users.filter(is_masmate=True)
    rows = list(users.order_by("user_name", "pk")[offset:offset + limit + 1])
    return Response({
        "results": [public_profile(user) for user in rows[:limit]],
        "next_offset": offset + limit if len(rows) > limit else None,
    })


@api_view(["PUT"])
@permission_classes([IsAuthenticated])
def become_masmates(request, user_id):
    if not isinstance(request.data, dict) or request.data:
        return Response({"detail": "リクエスト本文は不要です。"}, status=400)
    target = get_object_or_404(User, pk=user_id, is_active=True)
    if target.pk == request.user.pk:
        return Response({"detail": "自分自身は追加できません。"}, status=400)
    first_id, second_id = sorted((request.user.pk, target.pk))
    # Canonical ordering and a DB unique constraint make both directions idempotent.
    Masmate.objects.get_or_create(first_id=first_id, second_id=second_id)
    target.is_masmate = True
    return Response(public_profile(target), status=status.HTTP_200_OK)
