from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from note.models import Workout


class AuthAPITests(TestCase):
    def setUp(self):
        self.client = APIClient(enforce_csrf_checks=True)
        self.registration = {
            "email": "training@example.test",
            "user_name": "Training user",
            "password": "Test-only!47-Pine-Cloud",
        }

    def csrf_token(self):
        response = self.client.get("/api/auth/csrf/")
        self.assertEqual(response.status_code, 200)
        return response.json()["csrf_token"]

    def register(self):
        response = self.client.post(
            "/api/auth/register/", self.registration, format="json"
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(set(response.json()), {"user_id", "email", "user_name"})
        user = get_user_model().objects.get(pk=response.json()["user_id"])
        self.assertTrue(user.check_password(self.registration["password"]))
        return response.json()

    def login(self, token):
        return self.client.post(
            "/api/auth/login/",
            {key: self.registration[key] for key in ("email", "password")},
            format="json", HTTP_X_CSRFTOKEN=token,
        )

    def test_session_lifecycle_and_workout_ownership(self):
        user = self.register()
        self.assertEqual(self.client.get("/api/users/me/").status_code, 403)
        before_login = self.csrf_token()
        response = self.login(before_login)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), user)
        self.assertEqual(self.client.get("/api/users/me/").json(), user)

        # Login rotates CSRF. Writes must use a freshly fetched token.
        self.assertEqual(self.client.post(
            "/api/workouts/", {}, format="json", HTTP_X_CSRFTOKEN=before_login
        ).status_code, 403)
        token = self.csrf_token()
        response = self.client.post(
            "/api/workouts/", {}, format="json", HTTP_X_CSRFTOKEN=token
        )
        self.assertEqual(response.status_code, 201)
        workout = Workout.objects.get(pk=response.json()["workout_id"])
        self.assertEqual(str(workout.user_id), user["user_id"])
        self.assertEqual(self.client.get(
            f"/api/workouts/{workout.pk}/"
        ).status_code, 200)

        self.assertEqual(self.client.post(
            "/api/auth/logout/", {}, format="json"
        ).status_code, 403)
        self.assertEqual(self.client.post(
            "/api/auth/logout/", {}, format="json", HTTP_X_CSRFTOKEN=token
        ).status_code, 204)
        self.assertEqual(self.client.get("/api/users/me/").status_code, 403)
        self.assertEqual(self.client.get(
            f"/api/workouts/{workout.pk}/"
        ).status_code, 403)

    def test_login_requires_csrf_and_valid_credentials(self):
        self.register()
        self.assertEqual(self.login("").status_code, 403)
        self.registration["password"] = "Incorrect-password!47"
        self.assertEqual(self.login(self.csrf_token()).status_code, 400)
        self.assertEqual(self.client.get("/api/users/me/").status_code, 403)

    def test_registration_rejects_duplicate_email_and_weak_password(self):
        self.register()
        self.assertEqual(self.client.post(
            "/api/auth/register/", self.registration, format="json"
        ).status_code, 400)
        response = self.client.post(
            "/api/auth/register/",
            {**self.registration, "email": "other@example.test", "password": "123"},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("password", response.json())
        self.assertEqual(get_user_model().objects.count(), 1)
