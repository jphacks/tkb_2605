from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response

from .serializers import RegisterSerializer

from django.contrib.auth import authenticate, login as django_login
from django.middleware.csrf import get_token
from django.views.decorators.csrf import csrf_protect
from rest_framework.permissions import IsAuthenticated

from .models import User
from .serializers import RegisterSerializer, LoginSerializer
from django.contrib.auth import logout as django_logout


@api_view(["POST"])
@permission_classes([AllowAny])
def register(request: Request) -> Response:
    serializer = RegisterSerializer(data=request.data)

    # 不正な入力なら400のエラーレスポンスになる
    serializer.is_valid(raise_exception=True)

    # Serializerのcreate()が呼ばれる
    serializer.save()

    return Response(
        serializer.data,
        status=status.HTTP_201_CREATED,
    )
    
# CSRFトークンを取得する
@api_view(["GET"])
@permission_classes([AllowAny])
def csrf(request: Request) -> Response:
    return Response({
        "csrf_token": get_token(request),
    })


# ログインする
@api_view(["POST"])
@permission_classes([AllowAny])
@csrf_protect
def login(request: Request) -> Response:
    serializer = LoginSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    # 登録時と同じ方法でメールアドレスを整える
    email = User.objects.normalize_email(
        serializer.validated_data["email"]
    )

    # メールとパスワードが一致するユーザーを探す
    user = authenticate(
        request,
        email=email,
        password=serializer.validated_data["password"],
    )

    if user is None:
        return Response(
            {"detail": "メールアドレスまたはパスワードが違います。"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # ログイン状態をセッションに保存する
    django_login(request, user)

    # 登録APIと同じユーザー情報の形式で返す
    return Response(
        RegisterSerializer(user).data,
        status=status.HTTP_200_OK,
    )


# ログイン中の自分の情報を取得する
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def me(request: Request) -> Response:
    return Response(RegisterSerializer(request.user).data)

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def logout(request: Request) -> Response:
    django_logout(request)

    return Response(status=status.HTTP_204_NO_CONTENT)