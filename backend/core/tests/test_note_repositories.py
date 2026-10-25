from decimal import Decimal
from unittest.mock import patch
from uuid import uuid4

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.test import TestCase

from note import repositories
from note.models import Exercise, Workout, WorkoutExercise, WorkoutSet


class NoteRepositoryTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = get_user_model().objects.create_user(
            email="repository-user@example.com", password=None, user_name="repository-user"
        )
        cls.other_user = get_user_model().objects.create_user(
            email="other-user@example.com", password=None, user_name="other-user"
        )
        cls.exercise = Exercise.objects.create(display_name="Bench press")

    def setUp(self):
        self.workout = repositories.create_workout(self.user.pk)
        self.entry = repositories.add_workout_exercise(
            self.user.pk, self.workout.pk, self.exercise.pk
        )
        self.sets = [
            {"set_number": 2, "reps": 9, "weight": "18.0"},
            {"set_number": 1, "reps": 10, "weight": "20.0"},
        ]

    def save_sets(self, sets=None):
        return repositories.create_workout_sets(
            self.user.pk, self.entry.pk, self.sets if sets is None else sets
        )

    def test_start_workout_defaults(self):
        self.assertEqual(self.workout.user_id, self.user.pk)
        self.assertFalse(self.workout.is_completed)
        self.assertIsNotNone(self.workout.performed_at)

    def test_start_requires_existing_user(self):
        with self.assertRaises(ValidationError):
            repositories.create_workout(self.other_user.pk + 100)

    def test_add_assigns_position_and_allows_repeated_exercise(self):
        second = repositories.add_workout_exercise(
            self.user.pk, self.workout.pk, self.exercise.pk
        )
        self.assertEqual([self.entry.position, second.position], [1, 2])

    def test_add_uses_max_position_not_count(self):
        WorkoutExercise.objects.filter(pk=self.entry.pk).update(position=4)
        entry = repositories.add_workout_exercise(
            self.user.pk, self.workout.pk, self.exercise.pk
        )
        self.assertEqual(entry.position, 5)

    def test_missing_workout_and_exercise_raise(self):
        with self.assertRaises(Workout.DoesNotExist):
            repositories.add_workout_exercise(
                self.user.pk, uuid4(), self.exercise.pk
            )
        with self.assertRaises(Exercise.DoesNotExist):
            repositories.add_workout_exercise(
                self.user.pk, self.workout.pk, uuid4()
            )
        self.assertEqual(self.workout.exercises.count(), 1)

    def test_save_returns_individual_sets_sorted(self):
        rows = self.save_sets()
        self.assertEqual(
            [(row.set_number, row.reps, row.weight) for row in rows],
            [(1, 10, Decimal("20.0")), (2, 9, Decimal("18.0"))],
        )
        self.assertEqual(list(self.entry.sets.all()), rows)
        self.assertNotEqual(rows[0].pk, rows[1].pk)

    def test_resend_replaces_all_existing_sets(self):
        original_ids = [row.pk for row in self.save_sets()]
        rows = self.save_sets([{"set_number": 1, "reps": 8, "weight": "0"}])
        self.assertEqual(self.entry.sets.count(), 1)
        self.assertEqual(rows[0].weight, Decimal("0"))
        self.assertFalse(WorkoutSet.objects.filter(pk__in=original_ids).exists())

    def test_invalid_input_preserves_existing_sets(self):
        original = self.save_sets()
        invalid_payloads = [
            [], None, {},
            [{"set_number": 1, "reps": 10}],
            [{"set_number": 1, "reps": 10, "weight": "20", "extra": 1}],
            [None],
            [self.sets[0], self.sets[0]],
        ]
        for field, values in {
            "set_number": [0, -1, True, "1", 1.5],
            "reps": [0, -1, False, "10", 1.5],
            "weight": ["-0.1", "1.01", "100000.0", "NaN", "Infinity", "1e2",
                       " 20", "", "1\n", None, 20.0],
        }.items():
            for value in values:
                invalid_payloads.append([self.sets[0], {**self.sets[1], field: value}])
        for payload in invalid_payloads:
            with self.subTest(payload=payload):
                with self.assertRaises(ValidationError):
                    repositories.create_workout_sets(
                        self.user.pk, self.entry.pk, payload
                    )
                self.assertEqual(list(self.entry.sets.all()), original)

    def test_insert_failure_rolls_back_deleted_sets(self):
        original = self.save_sets()
        with patch(
            "note.repositories.WorkoutSet.objects.bulk_create",
            side_effect=IntegrityError("insert failed"),
        ):
            with self.assertRaises(IntegrityError):
                self.save_sets()
        self.assertEqual(list(self.entry.sets.all()), original)

    def test_all_operations_are_scoped_to_owner(self):
        operations = [
            (Workout.DoesNotExist, repositories.add_workout_exercise,
             (self.other_user.pk, self.workout.pk, self.exercise.pk)),
            (Workout.DoesNotExist, repositories.get_workout_detail,
             (self.other_user.pk, self.workout.pk)),
            (Workout.DoesNotExist, repositories.complete_workout,
             (self.other_user.pk, self.workout.pk)),
            (WorkoutExercise.DoesNotExist, repositories.create_workout_sets,
             (self.other_user.pk, self.entry.pk, self.sets)),
        ]
        for exception, operation, args in operations:
            with self.subTest(operation=operation.__name__):
                with self.assertRaises(exception):
                    operation(*args)
        self.workout.refresh_from_db()
        self.assertFalse(self.workout.is_completed)
        self.assertFalse(self.entry.sets.exists())

    def test_missing_records_raise(self):
        for operation in [
            repositories.get_workout_detail, repositories.complete_workout
        ]:
            with self.subTest(operation=operation.__name__):
                with self.assertRaises(Workout.DoesNotExist):
                    operation(self.user.pk, uuid4())
        with self.assertRaises(WorkoutExercise.DoesNotExist):
            repositories.create_workout_sets(self.user.pk, uuid4(), self.sets)

    def test_detail_prefetches_ordered_exercises_and_sets(self):
        self.save_sets()
        repositories.add_workout_exercise(
            self.user.pk, self.workout.pk, self.exercise.pk
        )
        with self.assertNumQueries(3):
            detail = repositories.get_workout_detail(self.user.pk, self.workout.pk)
            entries = list(detail.exercises.all())
            for entry in entries:
                self.assertEqual(entry.exercise.display_name, self.exercise.display_name)
                list(entry.sets.all())
        self.assertEqual([entry.position for entry in entries], [1, 2])
        self.assertEqual(
            [row.set_number for row in entries[0].sets.all()], [1, 2]
        )
        self.assertEqual(list(entries[1].sets.all()), [])

    def test_complete_is_idempotent_and_detail_remains_readable(self):
        repositories.complete_workout(self.user.pk, self.workout.pk)
        result = repositories.complete_workout(self.user.pk, self.workout.pk)
        self.assertTrue(result.is_completed)
        self.workout.refresh_from_db()
        self.assertTrue(self.workout.is_completed)
        self.assertTrue(
            repositories.get_workout_detail(self.user.pk, self.workout.pk).is_completed
        )

    def test_completed_workout_rejects_additions_and_replacements(self):
        original = self.save_sets()
        repositories.complete_workout(self.user.pk, self.workout.pk)
        with self.assertRaisesMessage(ValidationError, "Completed workouts"):
            repositories.add_workout_exercise(
                self.user.pk, self.workout.pk, self.exercise.pk
            )
        with self.assertRaisesMessage(ValidationError, "Completed workouts"):
            self.save_sets()
        self.assertEqual(self.workout.exercises.count(), 1)
        self.assertEqual(list(self.entry.sets.all()), original)
