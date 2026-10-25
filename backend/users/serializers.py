from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from .models import User


class RegisterSerializer(serializers.ModelSerializer):
    # モデルの主キーを、APIではuser_idという文字列で返す
    user_id = serializers.CharField(source="pk", read_only=True)

    # パスワードは受け取るだけで、レスポンスには含めない
    password = serializers.CharField(
        write_only=True,
        trim_whitespace=False,
    )

    class Meta:
        model = User
        fields = ["user_id", "email", "password", "user_name"]

    def validate(self, attrs):
        # パスワード検証用。まだDBには保存しない
        user = User(
            email=attrs["email"],
            user_name=attrs["user_name"],
        )

        try:
            validate_password(attrs["password"], user=user)
        except DjangoValidationError as error:
            raise serializers.ValidationError({
                "password": error.messages,
            })

        return attrs

    def create(self, validated_data):
        # あなたが作ったUserManagerを呼び出す
        return User.objects.create_user(**validated_data)
    
    
class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(
        write_only=True,
        trim_whitespace=False,
    )