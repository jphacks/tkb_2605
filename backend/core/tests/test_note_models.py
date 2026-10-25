import uuid
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.db.models.deletion import ProtectedError
from django.test import TestCase

from note.models import (
    BodyPart,
    Equipment,
    Exercise,
    ExerciseBodyPart,
    ExerciseEquipment,
    Workout,
    WorkoutExercise,
    WorkoutSet,
)


class NoteModelTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = get_user_model().objects.create_user(
            email="record-user@example.test", password=None, user_name="record-user"
        )
        cls.workout = Workout.objects.create(user=cls.user)
        cls.exercise = Exercise.objects.create(display_name="Bench press")
        cls.workout_exercise = WorkoutExercise.objects.create(
            workout=cls.workout, exercise=cls.exercise, position=1
        )
        cls.body_part = BodyPart.objects.create(name="Chest")
        cls.equipment = Equipment.objects.create(name="Barbell")

    def create_set(self, **overrides):
        values = {
            "workout_exercise": self.workout_exercise,
            "set_number": 1,
            "reps": 10,
            "weight": Decimal("20.0"),
        }
        values.update(overrides)
        return WorkoutSet.objects.create(**values)

    def test_defaults_and_uuid_primary_keys(self):
        workout_set = self.create_set()
        for obj in [
            self.workout, self.exercise, self.workout_exercise,
            workout_set, self.body_part, self.equipment,
        ]:
            with self.subTest(model=type(obj).__name__):
                self.assertIsInstance(obj.pk, uuid.UUID)
        self.assertFalse(self.workout.is_completed)
        self.assertIsNotNone(self.workout.performed_at)
        self.assertEqual(self.workout.user_id, self.user.pk)
        other = Workout.objects.create(user=self.user)
        self.assertNotEqual(self.workout.pk, other.pk)

    def test_each_set_keeps_its_own_reps_and_weight_in_order(self):
        self.create_set(set_number=3, reps=8, weight=Decimal("16.0"))
        self.create_set(set_number=1, reps=10, weight=Decimal("20.0"))
        self.create_set(set_number=2, reps=9, weight=Decimal("18.0"))
        self.assertEqual(
            list(self.workout_exercise.sets.values_list("set_number", "reps", "weight")),
            [
                (1, 10, Decimal("20.0")),
                (2, 9, Decimal("18.0")),
                (3, 8, Decimal("16.0")),
            ],
        )

    def test_workout_positions_are_unique_and_ordered(self):
        last = WorkoutExercise.objects.create(
            workout=self.workout, exercise=self.exercise, position=3
        )
        middle = WorkoutExercise.objects.create(
            workout=self.workout, exercise=self.exercise, position=2
        )
        self.assertEqual(
            list(self.workout.exercises.all()), [self.workout_exercise, middle, last]
        )
        with self.assertRaises(IntegrityError), transaction.atomic():
            WorkoutExercise.objects.create(
                workout=self.workout, exercise=self.exercise, position=1
            )
        other = Workout.objects.create(user=self.user)
        WorkoutExercise.objects.create(workout=other, exercise=self.exercise, position=1)

    def test_set_number_is_unique_within_each_workout_exercise(self):
        self.create_set()
        with self.assertRaises(IntegrityError), transaction.atomic():
            self.create_set()
        other = WorkoutExercise.objects.create(
            workout=self.workout, exercise=self.exercise, position=2
        )
        self.create_set(workout_exercise=other)

    def test_database_rejects_non_positive_position(self):
        for value in [0, -1]:
            with self.subTest(position=value):
                with self.assertRaises(IntegrityError), transaction.atomic():
                    WorkoutExercise.objects.create(
                        workout=self.workout, exercise=self.exercise, position=value
                    )

    def test_database_rejects_invalid_set_values(self):
        for field, value in [
            ("set_number", 0), ("set_number", -1),
            ("reps", 0), ("reps", -1), ("weight", Decimal("-0.1")),
        ]:
            with self.subTest(field=field, value=value):
                with self.assertRaises(IntegrityError), transaction.atomic():
                    self.create_set(**{field: value})

    def test_weight_precision_and_limits_are_validated(self):
        field = WorkoutSet._meta.get_field("weight")
        for value in ["0.0", "20.1", "99999.9"]:
            with self.subTest(value=value):
                self.assertEqual(field.clean(Decimal(value), None), Decimal(value))
        for value in ["-0.1", "20.01", "100000.0"]:
            with self.subTest(value=value):
                with self.assertRaises(ValidationError):
                    field.clean(Decimal(value), None)
        self.assertEqual(self.create_set(weight=Decimal("0.0")).weight, Decimal("0.0"))

    def test_master_relationships_and_uniqueness(self):
        ExerciseBodyPart.objects.create(exercise=self.exercise, body_part=self.body_part)
        ExerciseEquipment.objects.create(exercise=self.exercise, equipment=self.equipment)
        self.assertEqual(list(self.exercise.body_parts.all()), [self.body_part])
        self.assertEqual(list(self.exercise.equipment.all()), [self.equipment])
        for model, values in [
            (BodyPart, {"name": self.body_part.name}),
            (Equipment, {"name": self.equipment.name}),
            (ExerciseBodyPart, {"exercise": self.exercise, "body_part": self.body_part}),
            (ExerciseEquipment, {"exercise": self.exercise, "equipment": self.equipment}),
        ]:
            with self.subTest(model=model.__name__):
                with self.assertRaises(IntegrityError), transaction.atomic():
                    model.objects.create(**values)

    def test_referenced_exercise_cannot_be_deleted(self):
        with self.assertRaises(ProtectedError):
            self.exercise.delete()

    def test_workout_deletion_cascades_but_preserves_master(self):
        self.create_set()
        self.workout.delete()
        self.assertFalse(WorkoutExercise.objects.exists())
        self.assertFalse(WorkoutSet.objects.exists())
        self.assertTrue(Exercise.objects.filter(pk=self.exercise.pk).exists())

    def test_user_deletion_cascades_to_recorded_sets(self):
        self.create_set()
        self.user.delete()
        self.assertFalse(Workout.objects.exists())
        self.assertFalse(WorkoutExercise.objects.exists())
        self.assertFalse(WorkoutSet.objects.exists())

    def test_master_id_can_match_frontend_catalog(self):
        exercise_id = uuid.UUID("47e21a2d-a97c-5dda-8d91-64f46f513a7b")
        exercise = Exercise.objects.create(
            exercise_id=exercise_id, display_name="Catalog exercise"
        )
        exercise.refresh_from_db()
        self.assertEqual(exercise.pk, exercise_id)
