from django.contrib.auth.base_user import BaseUserManager


class UserManager(BaseUserManager):
    def create_user(self, email, password, user_name, **extra_fields):
        if not email:
            raise ValueError("メールアドレスは必須です")
        email = self.normalize_email(email)
        user = self.model(email=email, user_name=user_name, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password, user_name, **extra_fields):
            extra_fields.setdefault("is_staff", True)
            extra_fields.setdefault("is_superuser", True)

            if extra_fields.get("is_staff") is not True:
                raise ValueError("管理ユーザーにはis_staff=Trueが必要です")

            if extra_fields.get("is_superuser") is not True:
                raise ValueError(
                    "管理ユーザーにはis_superuser=Trueが必要です"
                )

            return self.create_user(
                email=email,
                password=password,
                user_name=user_name,
                **extra_fields,
            )
            
