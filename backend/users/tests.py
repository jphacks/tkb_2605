from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.test import TestCase
from rest_framework.test import APIClient
from .models import Masmate


class ProfileMasmateTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        user = get_user_model()
        cls.a = user.objects.create_user(email="a@example.test", password=None, user_name="Alice")
        cls.b = user.objects.create_user(email="b@example.test", password=None, user_name="Bob")
        cls.c = user.objects.create_user(email="c@example.test", password=None, user_name="Carol")
        cls.inactive = user.objects.create_user(email="inactive@example.test", password=None, user_name="Inactive", is_active=False)

    def setUp(self):
        self.client = APIClient()
        self.client.force_login(self.a)
        self.mine = "/api/users/me/profile/"
        self.target = f"/api/users/{self.b.pk}/profile/"
        self.connect = f"/api/users/{self.b.pk}/masmate/"

    def test_profile_update_persists_and_public_view_excludes_credentials(self):
        values = {"user_name": "New name", "bio": "Training regularly", "avatar_color": "#e7dff0"}
        response = self.client.patch(self.mine, values, format="json")
        self.assertEqual(response.status_code, 200)
        self.a.refresh_from_db()
        for field, value in values.items():
            self.assertEqual(getattr(self.a, field), value)
        self.client.force_login(self.b)
        data = self.client.get(f"/api/users/{self.a.pk}/profile/").json()
        self.assertEqual(set(data), {"user_id", "user_name", "bio", "avatar_color", "is_masmate"})
        self.assertEqual(data["bio"], values["bio"])
        self.assertEqual(data["user_id"], str(self.a.pk))
        self.assertNotIn("email", data)
        self.assertEqual(self.client.get("/api/users/me/").json()["user_name"], "Bob")

    def test_partial_update_preserves_fields_and_cannot_edit_another_person(self):
        self.assertEqual(self.client.patch(self.mine, {"bio": "Only bio"}, format="json").status_code, 200)
        self.assertEqual(self.client.get(self.mine).json()["user_name"], "Alice")
        self.assertEqual(self.client.patch(self.target, {"user_name": "Changed"}, format="json").status_code, 405)
        self.b.refresh_from_db()
        self.assertEqual(self.b.user_name, "Bob")

    def test_invalid_fields_do_not_partially_save(self):
        for values in [{}, [], {"user_name": " "}, {"user_name": "x" * 51}, {"bio": "x" * 161},
                       {"avatar_color": "red"}, {"email": "other@example.test"}, {"is_staff": True},
                       {"user_id": str(self.b.pk)}, {"user_name": "Changed", "password": "password"}]:
            with self.subTest(values=values):
                self.assertEqual(self.client.patch(self.mine, values, format="json").status_code, 400)
        self.a.refresh_from_db()
        self.assertEqual(self.a.user_name, "Alice")

    def test_masmates_are_symmetric_persistent_and_idempotent(self):
        for _ in range(2):
            response = self.client.put(self.connect)
            self.assertEqual(response.status_code, 200)
            self.assertTrue(response.json()["is_masmate"])
        self.assertEqual(Masmate.objects.count(), 1)
        self.assertTrue(self.client.get(self.target).json()["is_masmate"])
        self.client.force_login(self.b)
        response = self.client.put(f"/api/users/{self.a.pk}/masmate/")
        self.assertTrue(response.json()["is_masmate"])
        self.assertEqual(Masmate.objects.count(), 1)
        self.assertEqual(self.client.get("/api/users/?masmates=true").json()["results"][0]["user_id"], str(self.a.pk))
        self.assertEqual(self.client.delete(self.connect).status_code, 405)

    def test_self_inactive_and_unknown_connections_are_rejected(self):
        self.assertEqual(self.client.put(f"/api/users/{self.a.pk}/masmate/").status_code, 400)
        for pk in [self.inactive.pk, 9999]:
            self.assertEqual(self.client.put(f"/api/users/{pk}/masmate/").status_code, 404)
            self.assertEqual(self.client.get(f"/api/users/{pk}/profile/").status_code, 404)
        self.assertEqual(self.client.put(self.connect, {"first": self.c.pk}, format="json").status_code, 400)
        self.assertFalse(Masmate.objects.exists())

    def test_database_prevents_self_reverse_and_duplicate_pairs(self):
        Masmate.objects.create(first=self.a, second=self.b)
        for first, second in [(self.a, self.a), (self.b, self.a), (self.a, self.b)]:
            with self.subTest(first=first.pk, second=second.pk):
                with self.assertRaises(IntegrityError), transaction.atomic():
                    Masmate.objects.create(first=first, second=second)

    def test_search_and_pagination_hide_email_inactive_users_and_self(self):
        first = self.client.get("/api/users/?limit=1").json()
        self.assertEqual(first["results"][0]["user_id"], str(self.b.pk))
        self.assertEqual(first["next_offset"], 1)
        second = self.client.get("/api/users/?limit=1&offset=1").json()
        self.assertEqual(second["results"][0]["user_id"], str(self.c.pk))
        self.assertIsNone(second["next_offset"])
        found = self.client.get("/api/users/?q=bo").json()["results"]
        self.assertEqual([row["user_id"] for row in found], [str(self.b.pk)])
        self.assertNotIn("email", found[0])
        self.assertEqual(self.client.get("/api/users/?q=example.test").json()["results"], [])

    def test_masmate_search_is_scoped_to_request_user(self):
        Masmate.objects.create(first=self.a, second=self.b)
        self.assertEqual(len(self.client.get("/api/users/?masmates=true&q=Bob").json()["results"]), 1)
        self.assertEqual(self.client.get("/api/users/?masmates=true&q=Carol").json()["results"], [])
        self.client.force_login(self.c)
        self.assertEqual(self.client.get("/api/users/?masmates=true").json()["results"], [])

    def test_invalid_search_arguments(self):
        for query in ["limit=0", "limit=101", "offset=-1", "limit=1.5", "offset=x", "masmates=yes", "q=" + "a" * 51]:
            self.assertEqual(self.client.get("/api/users/?" + query).status_code, 400)

    def test_every_endpoint_requires_authentication_and_writes_require_csrf(self):
        self.client.logout()
        for method, url in [("get", self.mine), ("patch", self.mine), ("get", self.target), ("get", "/api/users/"), ("put", self.connect)]:
            self.assertEqual(getattr(self.client, method)(url).status_code, 403)
        client = APIClient(enforce_csrf_checks=True)
        client.force_login(self.a)
        self.assertEqual(client.patch(self.mine, {"bio": "New"}, format="json").status_code, 403)
        self.assertEqual(client.put(self.connect).status_code, 403)
        token = client.get("/api/auth/csrf/").json()["csrf_token"]
        self.assertEqual(client.patch(self.mine, {"bio": "New"}, format="json", HTTP_X_CSRFTOKEN=token).status_code, 200)
        self.assertEqual(client.put(self.connect, HTTP_X_CSRFTOKEN=token).status_code, 200)
