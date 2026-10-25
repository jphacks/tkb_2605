from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from .models import Notification, NotificationCursor


class NotificationAPITests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = get_user_model().objects.create_user(
            email="notifier@example.com", password="notification-test", user_name="Sender"
        )
        cls.other_user = get_user_model().objects.create_user(
            email="receiver@example.com", password="notification-test", user_name="Receiver"
        )

    def setUp(self):
        self.client = APIClient()
        self.client.force_login(self.user)

    def test_post_persists_notification_for_session_user(self):
        before = timezone.now()
        response = self.client.post("/api/notify/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {})
        notification = Notification.objects.get()
        self.assertEqual(notification.notifier_id, self.user.pk)
        self.assertGreaterEqual(notification.notified_at, before)
        self.assertLessEqual(notification.notified_at, timezone.now())

    def test_post_does_not_use_sender_from_body(self):
        response = self.client.post(
            "/api/notify/", {"notifier_id": self.other_user.pk}, format="json"
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(Notification.objects.get().notifier_id, self.user.pk)

    def test_saved_notification_is_visible_to_other_user_only(self):
        self.client.post("/api/notify/")
        notification = Notification.objects.get()
        self.assertEqual(self.client.get("/api/notify/").json(), [])
        self.client.force_login(self.other_user)
        response = self.client.get("/api/notify/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), [{
            "notification_id": notification.pk,
            "notifier_id": self.user.pk,
            "notifier_name": self.user.user_name,
            "notified_at": timezone.localtime(notification.notified_at).isoformat(),
        }])

    def test_get_returns_latest_twenty_after_excluding_self(self):
        notifications = [
            Notification.objects.create(notifier=self.other_user) for _ in range(25)
        ]
        now = timezone.now()
        for index, notification in enumerate(notifications):
            Notification.objects.filter(pk=notification.pk).update(
                notified_at=now - timedelta(minutes=index)
            )
        Notification.objects.create(notifier=self.user)
        response = self.client.get("/api/notify/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            [item["notification_id"] for item in response.json()],
            [notification.pk for notification in notifications[:20]],
        )
        self.assertEqual(self.client.get("/api/notify/").json(), [])

    def test_equal_timestamps_order_by_descending_id(self):
        first = Notification.objects.create(notifier=self.other_user)
        second = Notification.objects.create(notifier=self.other_user)
        Notification.objects.update(notified_at=timezone.now())
        self.assertEqual(
            [item["notification_id"] for item in self.client.get("/api/notify/").json()],
            [second.pk, first.pk],
        )

    def test_limit(self):
        Notification.objects.bulk_create([
            Notification(notifier=self.other_user) for _ in range(101)
        ])
        for limit in [1, 7, 100]:
            with self.subTest(limit=limit):
                NotificationCursor.objects.filter(user=self.user).delete()
                response = self.client.get("/api/notify/", {"limit": limit})
                self.assertEqual(response.status_code, 200)
                self.assertEqual(len(response.json()), limit)

    def test_invalid_limit_returns_validation_error(self):
        for limit in ["0", "-1", "101", "abc", "1.5", ""]:
            with self.subTest(limit=limit):
                response = self.client.get("/api/notify/", {"limit": limit})
                self.assertEqual(response.status_code, 400)
                self.assertIn("limit", response.json())
        self.assertFalse(NotificationCursor.objects.exists())

    def test_delivered_notifications_are_not_returned_again(self):
        first = Notification.objects.create(notifier=self.other_user)
        self.assertEqual(
            [item["notification_id"] for item in self.client.get("/api/notify/").json()],
            [first.pk],
        )
        self.assertEqual(self.client.get("/api/notify/").json(), [])
        second = Notification.objects.create(notifier=self.other_user)
        self.assertEqual(
            [item["notification_id"] for item in self.client.get("/api/notify/").json()],
            [second.pk],
        )
        self.assertEqual(self.client.get("/api/notify/").json(), [])

    def test_cursor_is_shared_between_sessions_and_survives_logout(self):
        Notification.objects.create(notifier=self.other_user)
        self.assertEqual(len(self.client.get("/api/notify/").json()), 1)
        other_client = APIClient()
        other_client.force_login(self.user)
        self.assertEqual(other_client.get("/api/notify/").json(), [])
        self.client.logout()
        self.client.force_login(self.user)
        self.assertEqual(self.client.get("/api/notify/").json(), [])

    def test_users_have_independent_cursors(self):
        third_user = get_user_model().objects.create_user(
            email="third@example.com", password="notification-test", user_name="Third"
        )
        notification = Notification.objects.create(notifier=third_user)
        for user in [self.user, self.other_user]:
            self.client.force_login(user)
            self.assertEqual(
                [item["notification_id"] for item in self.client.get("/api/notify/").json()],
                [notification.pk],
            )
            self.assertEqual(self.client.get("/api/notify/").json(), [])

    def test_empty_poll_does_not_hide_future_notifications(self):
        self.assertEqual(self.client.get("/api/notify/").json(), [])
        Notification.objects.create(notifier=self.user)
        self.assertEqual(self.client.get("/api/notify/").json(), [])
        notification = Notification.objects.create(notifier=self.other_user)
        self.assertEqual(
            [item["notification_id"] for item in self.client.get("/api/notify/").json()],
            [notification.pk],
        )

    def test_anonymous_requests_are_rejected(self):
        self.client.logout()
        for method in ["get", "post"]:
            with self.subTest(method=method):
                response = getattr(self.client, method)("/api/notify/")
                self.assertEqual(response.status_code, 403)
        self.assertFalse(Notification.objects.exists())

    def test_session_post_requires_csrf_token(self):
        client = APIClient(enforce_csrf_checks=True)
        client.force_login(self.user)
        self.assertEqual(client.post("/api/notify/").status_code, 403)
        self.assertFalse(Notification.objects.exists())
        response = client.get("/api/auth/csrf/")
        response = client.post(
            "/api/notify/", HTTP_X_CSRFTOKEN=response.json()["csrf_token"]
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(Notification.objects.get().notifier_id, self.user.pk)
