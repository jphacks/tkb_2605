from uuid import UUID, uuid4

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from note.models import Exercise, Workout, WorkoutExercise, WorkoutSet


class NoteAPITests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = get_user_model().objects.create_user(
            email="api-owner@example.com", password=None, user_name="api-owner"
        )
        cls.other_user = get_user_model().objects.create_user(
            email="api-other@example.com", password=None, user_name="api-other"
        )
        cls.exercise = Exercise.objects.create(display_name="Bench press")

    def setUp(self):
        self.client = APIClient()
        self.client.force_login(self.user)
        self.workout = Workout.objects.create(user=self.user)
        self.entry = WorkoutExercise.objects.create(
            workout=self.workout, exercise=self.exercise, position=1
        )
        self.detail_url = f"/api/workouts/{self.workout.pk}/"
        self.add_url = f"{self.detail_url}exercises/"
        self.sets_url = f"/api/workout-exercises/{self.entry.pk}/sets/"
        self.sets = [
            {"set_number": 2, "reps": 9, "weight": "18.0"},
            {"set_number": 1, "reps": 10, "weight": "20.0"},
        ]

    def test_start_returns_and_persists_real_workout(self):
        response = self.client.post("/api/workouts/", {}, format="json")
        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertEqual(
            set(data), {"workout_id", "user_id", "performed_at", "is_completed"}
        )
        UUID(data["workout_id"])
        workout = Workout.objects.get(pk=data["workout_id"])
        self.assertEqual(workout.user_id, self.user.pk)
        self.assertEqual(data["user_id"], self.user.pk)
        self.assertFalse(data["is_completed"])
        self.assertIsNotNone(workout.performed_at.utcoffset())
        second = self.client.post("/api/workouts/", {}, format="json")
        self.assertNotEqual(data["workout_id"], second.json()["workout_id"])

    def test_add_uses_requested_master_and_next_position(self):
        response = self.client.post(
            self.add_url, {"exercise_id": str(self.exercise.pk)}, format="json"
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(
            response.json(),
            {
                "workout_exercise_id": str(
                    self.workout.exercises.get(position=2).pk
                ),
                "workout_id": str(self.workout.pk),
                "exercise_id": str(self.exercise.pk),
                "display_name": self.exercise.display_name,
                "position": 2,
            },
        )

    def test_sets_persist_and_detail_returns_ordered_values(self):
        response = self.client.post(self.sets_url, {"sets": self.sets}, format="json")
        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertEqual(data["workout_exercise_id"], str(self.entry.pk))
        self.assertEqual(WorkoutSet.objects.count(), 2)
        self.assertEqual(
            [(row["set_number"], row["reps"], row["weight"]) for row in data["sets"]],
            [(1, 10, "20.0"), (2, 9, "18.0")],
        )
        for row in data["sets"]:
            self.assertEqual(
                set(row), {"workout_set_id", "set_number", "reps", "weight"}
            )
            self.assertTrue(WorkoutSet.objects.filter(pk=row["workout_set_id"]).exists())
        detail = self.client.get(self.detail_url).json()
        self.assertEqual(
            detail["exercises"],
            [{
                "workout_exercise_id": str(self.entry.pk),
                "exercise_id": str(self.exercise.pk),
                "display_name": self.exercise.display_name,
                "position": 1,
                "sets": data["sets"],
            }],
        )

    def test_resend_replaces_sets_and_invalid_payload_preserves_them(self):
        self.client.post(self.sets_url, {"sets": self.sets}, format="json")
        valid = [{"set_number": 1, "reps": 8, "weight": "0"}]
        response = self.client.post(self.sets_url, {"sets": valid}, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["sets"][0]["weight"], "0.0")
        saved = list(self.entry.sets.values_list("pk", "reps", "weight"))
        invalid_sets = [
            [], None, {},
            [{"set_number": 1, "reps": True, "weight": "20"}],
            [{"set_number": 0, "reps": 10, "weight": "20"}],
            [{"set_number": 1, "reps": 0, "weight": "20"}],
            [{"set_number": 1, "reps": 10, "weight": "1.01"}],
            [{"set_number": 1, "reps": 10, "weight": 20}],
            [{"set_number": 1, "reps": 10, "weight": "-1"}],
            [{"set_number": 1, "reps": 10, "weight": "100000.0"}],
            [valid[0], valid[0]],
        ]
        for sets in invalid_sets:
            with self.subTest(sets=sets):
                response = self.client.post(self.sets_url, {"sets": sets}, format="json")
                self.assertEqual(response.status_code, 400)
                self.assertTrue(response.json())
                self.assertEqual(
                    list(self.entry.sets.values_list("pk", "reps", "weight")), saved
                )

    def test_completion_persists_and_is_idempotent(self):
        for _ in range(2):
            response = self.client.patch(
                self.detail_url, {"is_completed": True}, format="json"
            )
            self.assertEqual(response.status_code, 200)
            self.assertTrue(response.json()["is_completed"])
        self.workout.refresh_from_db()
        self.assertTrue(self.workout.is_completed)
        self.assertTrue(self.client.get(self.detail_url).json()["is_completed"])
        for url, body in [
            (self.add_url, {"exercise_id": str(self.exercise.pk)}),
            (self.sets_url, {"sets": self.sets}),
        ]:
            response = self.client.post(url, body, format="json")
            self.assertEqual(response.status_code, 409)
            self.assertIn("detail", response.json())
        self.assertEqual(self.workout.exercises.count(), 1)
        self.assertFalse(self.entry.sets.exists())

    def test_strict_request_shapes(self):
        for method, url, body in [
            ("post", "/api/workouts/", {"user_id": self.other_user.pk}),
            ("post", "/api/workouts/", []),
            ("post", self.add_url, {}),
            ("post", self.add_url, {"exercise_id": "bad-id"}),
            ("post", self.sets_url, {}),
            ("post", self.sets_url, {"sets": self.sets, "extra": 1}),
            *[("patch", self.detail_url, {"is_completed": value})
              for value in [False, "true", 1, None]],
            ("patch", self.detail_url, {}),
            ("patch", self.detail_url, {"is_completed": True, "user_id": 1}),
        ]:
            with self.subTest(body=body, url=url):
                response = getattr(self.client, method)(url, body, format="json")
                self.assertEqual(response.status_code, 400)
        self.workout.refresh_from_db()
        self.assertFalse(self.workout.is_completed)

    def test_missing_and_foreign_resources_return_404(self):
        for user in [self.user, self.other_user]:
            self.client.force_login(user)
            workout_id = uuid4() if user == self.user else self.workout.pk
            entry_id = uuid4() if user == self.user else self.entry.pk
            for method, url, body in [
                ("get", f"/api/workouts/{workout_id}/", None),
                ("patch", f"/api/workouts/{workout_id}/", {"is_completed": True}),
                ("post", f"/api/workouts/{workout_id}/exercises/",
                 {"exercise_id": str(self.exercise.pk)}),
                ("post", f"/api/workout-exercises/{entry_id}/sets/", {"sets": self.sets}),
            ]:
                with self.subTest(user=user.pk, url=url, method=method):
                    response = getattr(self.client, method)(url, body, format="json")
                    self.assertEqual(response.status_code, 404)
        self.assertFalse(self.entry.sets.exists())
        self.workout.refresh_from_db()
        self.assertFalse(self.workout.is_completed)

    def test_unknown_exercise_and_malformed_path(self):
        response = self.client.post(
            self.add_url, {"exercise_id": str(uuid4())}, format="json"
        )
        self.assertEqual(response.status_code, 404)
        for method, url, body in [
            ("get", "/api/workouts/bad-id/", None),
            ("patch", "/api/workouts/bad-id/", {"is_completed": True}),
            ("post", "/api/workouts/bad-id/exercises/",
             {"exercise_id": str(self.exercise.pk)}),
            ("post", "/api/workout-exercises/bad-id/sets/", {"sets": self.sets}),
        ]:
            with self.subTest(url=url, method=method):
                self.assertEqual(
                    getattr(self.client, method)(url, body, format="json").status_code, 400
                )

    def test_authentication_required_for_every_operation(self):
        self.client.logout()
        for method, url, body in [
            ("post", "/api/workouts/", {}),
            ("post", self.add_url, {"exercise_id": str(self.exercise.pk)}),
            ("post", self.sets_url, {"sets": self.sets}),
            ("get", self.detail_url, None),
            ("patch", self.detail_url, {"is_completed": True}),
        ]:
            with self.subTest(method=method, url=url):
                response = getattr(self.client, method)(url, body, format="json")
                self.assertEqual(response.status_code, 403)
                self.assertIn("detail", response.json())

    def test_session_writes_require_csrf(self):
        client = APIClient(enforce_csrf_checks=True)
        client.force_login(self.user)
        self.assertEqual(client.get(self.detail_url).status_code, 200)
        for method, url, body in [
            ("post", "/api/workouts/", {}),
            ("post", self.add_url, {"exercise_id": str(self.exercise.pk)}),
            ("post", self.sets_url, {"sets": self.sets}),
            ("patch", self.detail_url, {"is_completed": True}),
        ]:
            with self.subTest(url=url):
                self.assertEqual(
                    getattr(client, method)(url, body, format="json").status_code, 403
                )
        client.get("/admin/login/")
        token = client.cookies["csrftoken"].value
        self.assertEqual(
            client.post("/api/workouts/", {}, format="json", HTTP_X_CSRFTOKEN=token)
            .status_code,
            201,
        )

    def test_malformed_json_and_unsupported_methods(self):
        response = self.client.post(
            "/api/workouts/", data="{", content_type="application/json"
        )
        self.assertEqual(response.status_code, 400)
        for url in ["/api/workouts/", self.add_url, self.sets_url, self.detail_url]:
            with self.subTest(url=url):
                self.assertEqual(self.client.delete(url).status_code, 405)
