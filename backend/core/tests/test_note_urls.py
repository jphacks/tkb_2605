from django.test import SimpleTestCase
from django.urls import resolve, reverse


class NoteMockTests(SimpleTestCase):
    def test_routes(self):
        routes = [
            ("create_workout", {}, "/api/workouts/"),
            (
                "add_workout_exercise",
                {"workout_id": "workout-1"},
                "/api/workouts/workout-1/exercises/",
            ),
            (
                "create_workout_sets",
                {"workout_exercise_id": "workout-exercise-1"},
                "/api/workout-exercises/workout-exercise-1/sets/",
            ),
            (
                "workout_detail",
                {"workout_id": "workout-1"},
                "/api/workouts/workout-1/",
            ),
        ]
        for name, kwargs, url in routes:
            with self.subTest(name=name):
                self.assertEqual(reverse(f"note:{name}", kwargs=kwargs), url)
                self.assertEqual(resolve(url).view_name, f"note:{name}")
                self.assertEqual(resolve(url).kwargs, kwargs)

    def test_mock_responses(self):
        requests = [
            ("post", "/api/workouts/", {}, 201, "workout_id", "workout-1"),
            (
                "post",
                "/api/workouts/custom-workout/exercises/",
                {"exercise_id": "exercise-1"},
                201,
                "workout_id",
                "custom-workout",
            ),
            (
                "post",
                "/api/workout-exercises/custom-exercise/sets/",
                {"sets": [{"set_number": 1, "reps": 10, "weight": "20.0"}]},
                201,
                "workout_exercise_id",
                "custom-exercise",
            ),
            ("get", "/api/workouts/custom-workout/", {}, 200, "is_completed", False),
            (
                "patch",
                "/api/workouts/custom-workout/",
                {"is_completed": True},
                200,
                "is_completed",
                True,
            ),
        ]
        for method, url, data, code, key, value in requests:
            with self.subTest(method=method, url=url):
                response = getattr(self.client, method)(
                    url, data=data, content_type="application/json"
                )
                self.assertEqual(response.status_code, code)
                self.assertEqual(response.json()[key], value)

    def test_detail_contains_different_weights_and_reps(self):
        response = self.client.get("/api/workouts/workout-1/")
        sets = response.json()["exercises"][0]["sets"]
        self.assertEqual(
            [(item["set_number"], item["reps"], item["weight"]) for item in sets],
            [(1, 10, "20.0"), (2, 9, "18.0"), (3, 8, "16.0")],
        )

    def test_unsupported_methods(self):
        for url in [
            "/api/workouts/",
            "/api/workouts/workout-1/exercises/",
            "/api/workout-exercises/workout-exercise-1/sets/",
            "/api/workouts/workout-1/",
        ]:
            with self.subTest(url=url):
                self.assertEqual(self.client.delete(url).status_code, 405)

    def test_completion_does_not_change_static_mock(self):
        url = "/api/workouts/workout-1/"
        self.client.patch(url, {"is_completed": True}, content_type="application/json")
        self.assertFalse(self.client.get(url).json()["is_completed"])
