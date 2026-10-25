from rest_framework import serializers

from note.models import Workout
from .models import Posts

from django.contrib.auth import get_user_model
from django.db.models import CharField
from django.db.models.functions import Cast

from . import repositories


class CreatePostSerializer(serializers.Serializer):
    post_type = serializers.ChoiceField(choices=[1, 2, 3])
    content = serializers.CharField(
        max_length=500,
        required=False,
        allow_blank=True,
        default="",
    )
    workout_id = serializers.UUIDField(
        required=False,
        allow_null=True,
        default=None,
    )
    
    def validate(self, attrs):
            post_type = attrs["post_type"]
            content = attrs["content"]
            workout_id = attrs["workout_id"]

            # 通常投稿には本文が必要
            if post_type == 1 and not content:
                raise serializers.ValidationError({
                    "content": "投稿内容を入力してください。",
                })

            # 記録共有には、自分のワークアウトが必要
            if post_type == 2:
                if workout_id is None:
                    raise serializers.ValidationError({
                        "workout_id": "ワークアウトを指定してください。",
                    })

                user = self.context["request"].user

                if not Workout.objects.filter(
                    workout_id=workout_id,
                    user_id=user.pk,
                ).exists():
                    raise serializers.ValidationError({
                        "workout_id": "指定したワークアウトが見つかりません。",
                    })

            elif workout_id is not None:
                raise serializers.ValidationError({
                    "workout_id": "この投稿種別には指定できません。",
                })

            # 開始宣言の本文は空にしてフロントに任せる
            if post_type == 3:
                attrs["content"] = ""

            return attrs
        
class PostSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    like_count = serializers.SerializerMethodField()
    is_liked = serializers.SerializerMethodField()

    class Meta:
        model = Posts
        fields = [
            "post_id",
            "user_id",
            "user_name",
            "post_type",
            "content",
            "posted_at",
            "workout_id",
            "like_count",
            "is_liked",
        ]
        read_only_fields = fields

    def get_user_name(self, post):
        User = get_user_model()

        return (
            User.objects.annotate(public_id=Cast("pk", CharField())).filter(public_id=post.user_id)
            .values_list("user_name", flat=True)
            .first()
        ) or "不明なユーザー"

    def get_like_count(self, post):
        return repositories.count_likes(post.post_id)

    def get_is_liked(self, post):
        request = self.context["request"]

        return repositories.has_liked(
            user_id=str(request.user.pk),
            post_id=post.post_id,
        )
        
        
class PostListQuerySerializer(serializers.Serializer):
    limit = serializers.IntegerField(
        min_value=1,
        max_value=100,
        default=20,
    )
    offset = serializers.IntegerField(
        min_value=0,
        default=0,
    )
        