from django.test import SimpleTestCase
from django.urls import resolve, reverse


class NoteURLTests(SimpleTestCase):
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
