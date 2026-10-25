from django.db import DatabaseError, connection
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.response import Response
from rest_framework.request import Request
from rest_framework import status

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated

from . import repositories
from .serializers import CreatePostSerializer, PostSerializer, PostListQuerySerializer

from uuid import UUID


CREATE_POSTS_RESPONSE_EXAMPLE = {
  "post_id": "12",
  "user_id": "3",
  "user_name": "たろう",
  "post_type": 1,
  "content": "今日はスクワットを頑張った！",
  "posted_at": "2026-10-24T15:00:00+09:00",
  "workout_id": None,
  "like_count": 0,
  "is_liked": False
}

GET_POSTS_RESPONSE_EXAMPLE = {
  "results": [
    {
      "post_id": "12",
      "user_id": "3",
      "user_name": "たろう",
      "post_type": 1,
      "content": "今日はスクワットを頑張った！",
      "posted_at": "2026-10-24T15:00:00+09:00",
      "workout_id": None,
      "like_count": 5,
      "is_liked": True
    }
  ],
  "next_offset": None
}

LIKED_RESPONSE_EXAMPLE = {
  "post_id": "12",
  "like_count": 6,
  "is_liked": True
}



@api_view(["GET", "POST"])
@authentication_classes([SessionAuthentication])
@permission_classes([IsAuthenticated])
def posts(request: Request):
    if request.method == "GET":
      query = PostListQuerySerializer(data=request.query_params)
      query.is_valid(raise_exception=True)

      limit = query.validated_data["limit"]
      offset = query.validated_data["offset"]

      # 続きが存在するか調べるため、1件多く取得
      posts = list(repositories.get_all_new_posts(
          limit=limit + 1,
          offset=offset,
      ))

      has_next = len(posts) > limit

      serializer = PostSerializer(
          posts[:limit],
          many=True,
          context={"request": request},
      )

      return Response({
          "results": serializer.data,
          "next_offset": offset + limit if has_next else None,
      })

    # リクエストのJSONを確認
    serializer = CreatePostSerializer(
        data=request.data,
        context={"request": request},
    )
    serializer.is_valid(raise_exception=True)

    # 確認済みの入力を取得
    data = serializer.validated_data
    workout_id = data["workout_id"]

    # DB操作を呼ぶ
    post = repositories.create_post(
        user_id=str(request.user.pk),
        post_type=data["post_type"],
        content=data["content"],
        workout_id=(
            str(workout_id) if workout_id is not None else None
        ),
    )

    # 保存した投稿からレスポンスを作る
    serializer = PostSerializer(
        post,
        context={"request": request},
    )

    return Response(
        serializer.data,
        status=status.HTTP_201_CREATED,
    )

@api_view(["GET"])
@authentication_classes([SessionAuthentication])
@permission_classes([IsAuthenticated])
def get_user_posts(request: Request, user_id: str):
    query = PostListQuerySerializer(data=request.query_params)
    query.is_valid(raise_exception=True)

    limit = query.validated_data["limit"]
    offset = query.validated_data["offset"]

    # URLで指定されたユーザーの投稿を取得
    posts = list(repositories.get_user_new_posts(
        user_id=user_id,
        limit=limit + 1,
        offset=offset,
    ))

    has_next = len(posts) > limit

    serializer = PostSerializer(
        posts[:limit],
        many=True,
        context={"request": request},
    )

    return Response({
        "results": serializer.data,
        "next_offset": offset + limit if has_next else None,
    })

@api_view(["PUT"])
@authentication_classes([SessionAuthentication])
@permission_classes([IsAuthenticated])
def like_post(request: Request, post_id: UUID):
    post_id_str = str(post_id)

    # いいね対象の投稿が存在するか確認
    if not repositories.post_exists(post_id_str):
        return Response(
            {"detail": "投稿が見つかりません。"},
            status=status.HTTP_404_NOT_FOUND,
        )

    # ログイン中のユーザーとしていいねする
    repositories.like_post(
        user_id=str(request.user.pk),
        post_id=post_id_str,
    )

    return Response(
        {
            "post_id": post_id_str,
            "like_count": repositories.count_likes(post_id_str),
            "is_liked": True,
        },
        status=status.HTTP_200_OK,
    )

