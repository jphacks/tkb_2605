from django.db import DatabaseError, connection
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.request import Request
from rest_framework import status


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
def posts(request: Request):
    if request.method == "GET":
        return Response(
            GET_POSTS_RESPONSE_EXAMPLE,
            status=status.HTTP_200_OK,
        )

    return Response(
        CREATE_POSTS_RESPONSE_EXAMPLE,
        status=status.HTTP_201_CREATED,
    )

@api_view(["GET"])
def get_user_posts(request: Request, user_id: str):
    return Response(GET_POSTS_RESPONSE_EXAMPLE, status=status.HTTP_200_OK)

@api_view(["PUT"])
def like_post(request: Request, post_id: str):
    status_code = status.HTTP_200_OK
    return Response(LIKED_RESPONSE_EXAMPLE, status=status_code)

