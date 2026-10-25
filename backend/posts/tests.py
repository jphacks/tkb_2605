from unittest.mock import patch
from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.test import TestCase
from rest_framework.test import APIClient
from note.models import Workout
from notifications.models import Notification
from .models import Posts, Like


class PostLikeNotificationTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.owner = get_user_model().objects.create_user(email="owner@example.test", password=None, user_name="Owner")
        cls.actor = get_user_model().objects.create_user(email="actor@example.test", password=None, user_name="Actor")
        cls.other = get_user_model().objects.create_user(email="other@example.test", password=None, user_name="Other")
        cls.post = Posts.objects.create(user_id=str(cls.owner.pk), post_type=1, content="A saved post")

    def setUp(self):
        self.client = APIClient()
        self.client.force_login(self.actor)
        self.like_url = f"/api/posts/{self.post.pk}/like/"

    def test_create_list_detail_persist_and_bind_to_authenticated_author(self):
        response = self.client.post("/api/posts/", {"post_type": 1, "content": "My new post", "user_id": str(self.owner.pk)}, format="json")
        self.assertEqual(response.status_code, 201)
        saved = Posts.objects.get(pk=response.json()["post_id"])
        self.assertEqual(saved.user_id, str(self.actor.pk))
        self.assertEqual(saved.content, "My new post")
        self.assertEqual(self.client.get(f"/api/posts/{saved.pk}/").json(), response.json())
        rows = self.client.get(f"/api/users/{self.actor.pk}/posts/").json()["results"]
        self.assertEqual([row["post_id"] for row in rows], [str(saved.pk)])
        self.assertNotIn("email", rows[0])
        first = self.client.get("/api/posts/?limit=1").json()
        self.assertEqual(first["next_offset"], 1)
        self.assertEqual(self.client.get("/api/posts/?limit=1&offset=1").json()["results"][0]["post_id"], str(self.post.pk))
        for query in ["limit=0", "limit=101", "offset=-1", "offset=x"]:
            self.assertEqual(self.client.get("/api/posts/?" + query).status_code, 400)

    def test_post_validation_and_workout_ownership(self):
        workout = Workout.objects.create(user=self.owner)
        for data in [{}, {"post_type": 1, "content": " "}, {"post_type": 7}, {"post_type": 1, "content": "x" * 2001}, {"post_type": 2, "content": "test", "workout_id": str(workout.pk)}]:
            self.assertEqual(self.client.post("/api/posts/", data, format="json").status_code, 400)
        self.client.force_login(self.owner)
        self.assertEqual(self.client.post("/api/posts/", {"post_type": 2, "content": "My workout", "workout_id": str(workout.pk)}, format="json").status_code, 201)
        self.assertEqual(self.client.post("/api/posts/", {"post_type": 3}, format="json").status_code, 201)

    def test_like_returns_real_state_and_notifies_only_author(self):
        response = self.client.put(self.like_url)
        self.assertEqual(response.json(), {"post_id": str(self.post.pk), "like_count": 1, "is_liked": True})
        notice = Notification.objects.get()
        self.assertEqual(notice.recipient, self.owner)
        self.assertEqual(notice.notifier, self.actor)
        self.assertEqual(notice.post, self.post)
        self.assertTrue(self.client.get(f"/api/posts/{self.post.pk}/").json()["is_liked"])
        for viewer in [self.actor, self.other]:
            self.client.force_login(viewer)
            self.assertEqual(self.client.get("/api/notify/").json(), [])
        self.client.force_login(self.owner)
        rows = self.client.get("/api/notify/").json()
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["notification_type"], "post_liked")
        self.assertEqual(rows[0]["notifier_id"], self.actor.pk)
        self.assertEqual(rows[0]["post_id"], str(self.post.pk))
        self.assertEqual(rows[0]["post_excerpt"], self.post.content)
        self.assertNotIn("recipient", rows[0])
        self.assertEqual(self.client.get("/api/notify/").json(), [])
        self.assertFalse(self.client.get(f"/api/posts/{self.post.pk}/").json()["is_liked"])

    def test_unlike_and_relike_do_not_duplicate_notification(self):
        self.client.put(self.like_url)
        self.assertEqual(self.client.put(self.like_url).json()["like_count"], 0)
        self.assertFalse(Like.objects.exists())
        self.client.put(self.like_url)
        self.assertEqual(Like.objects.count(), 1)
        self.assertEqual(Notification.objects.count(), 1)
        self.client.force_login(self.other)
        self.assertEqual(self.client.put(self.like_url).json()["like_count"], 2)
        self.assertEqual(Notification.objects.count(), 2)

    def test_self_like_does_not_notify_and_body_cannot_spoof_actor_or_recipient(self):
        self.client.force_login(self.owner)
        self.client.put(self.like_url)
        self.assertFalse(Notification.objects.exists())
        self.client.force_login(self.actor)
        self.client.put(self.like_url, {"user_id": str(self.other.pk), "recipient_id": self.other.pk}, format="json")
        notice = Notification.objects.get()
        self.assertEqual(notice.notifier, self.actor)
        self.assertEqual(notice.recipient, self.owner)

    def test_start_and_like_notifications_share_cursor_without_leaking_targets(self):
        self.client.put(self.like_url)
        self.client.post("/api/notify/", {"notification_type": "post_liked", "recipient_id": self.other.pk}, format="json")
        self.client.force_login(self.other)
        other_rows = self.client.get("/api/notify/").json()
        self.assertEqual(len(other_rows), 1)
        self.assertNotIn("notification_type", other_rows[0])
        self.client.force_login(self.owner)
        self.assertEqual(len(self.client.get("/api/notify/").json()), 2)

    def test_authentication_and_csrf_required(self):
        self.client.logout()
        for method, url in [("get", "/api/posts/"), ("post", "/api/posts/"), ("get", f"/api/users/{self.owner.pk}/posts/"), ("get", f"/api/posts/{self.post.pk}/"), ("put", self.like_url)]:
            self.assertEqual(getattr(self.client, method)(url).status_code, 403)
        client = APIClient(enforce_csrf_checks=True)
        client.force_login(self.actor)
        self.assertEqual(client.put(self.like_url).status_code, 403)
        self.assertEqual(client.post("/api/posts/", {"post_type": 1, "content": "x"}).status_code, 403)
        token = client.get("/api/auth/csrf/").json()["csrf_token"]
        self.assertEqual(client.put(self.like_url, HTTP_X_CSRFTOKEN=token).status_code, 200)

    def test_missing_invalid_or_inactive_post_author_returns_404(self):
        for value in ["no-such-id", "00000000-0000-0000-0000-000000000000"]:
            self.assertEqual(self.client.put(f"/api/posts/{value}/like/").status_code, 404)
            self.assertEqual(self.client.get(f"/api/posts/{value}/").status_code, 404)
        self.owner.is_active = False
        self.owner.save()
        self.assertEqual(self.client.put(self.like_url).status_code, 404)
        self.assertEqual(self.client.get("/api/posts/").json()["results"], [])

    def test_database_constraints_and_post_deletion(self):
        self.client.put(self.like_url)
        with self.assertRaises(IntegrityError), transaction.atomic():
            Like.objects.create(post_id=self.post, user_id=str(self.actor.pk))
        with self.assertRaises(IntegrityError), transaction.atomic():
            Notification.objects.create(notification_type="post_liked", notifier=self.actor)
        with self.assertRaises(IntegrityError), transaction.atomic():
            Notification.objects.create(notification_type="post_liked", notifier=self.actor, recipient=self.owner, post=self.post)
        self.post.delete()
        self.assertFalse(Notification.objects.exists())
        self.assertFalse(Like.objects.exists())

    def test_notification_failure_rolls_back_like(self):
        with patch("posts.views.Notification.objects.get_or_create", side_effect=RuntimeError("notification storage unavailable")):
            with self.assertRaises(RuntimeError):
                self.client.put(self.like_url)
        self.assertFalse(Like.objects.exists())
