import json
from copy import deepcopy
from io import StringIO
from tempfile import TemporaryDirectory
from pathlib import Path
from unittest.mock import patch
from uuid import uuid4

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase

from note.models import (
    BodyPart, Equipment, Exercise, ExerciseBodyPart, ExerciseEquipment,
    Workout, WorkoutExercise, WorkoutSet,
)


class SeedExerciseTests(TestCase):
    def setUp(self):
        self.part_id, self.equipment_id, self.exercise_id = [
            str(uuid4()) for _ in range(3)
        ]
        self.catalog = {
            "body_parts": [{"body_part_id": self.part_id, "name": "Chest"}],
            "equipment": [{"equipment_id": self.equipment_id, "name": "Barbell"}],
            "exercises": [{
                "exercise_id": self.exercise_id,
                "display_name": "Bench press",
                "body_part_ids": [self.part_id],
                "equipment_ids": [self.equipment_id],
            }],
            "recommendations": {"bench-press": self.exercise_id},
        }

    def seed(self, data=None):
        stream = StringIO(json.dumps(self.catalog if data is None else data))
        output = StringIO()
        with patch("note.management.commands.seed_exercises.sys.stdin", stream):
            call_command("seed_exercises", "-", stdout=output)
        return output.getvalue()

    def test_initial_seed_and_repeated_execution_keep_ids_and_relationships(self):
        self.assertIn("Seeded 1 exercises", self.seed())
        ids = list(ExerciseBodyPart.objects.values_list("pk", flat=True))
        equipment_ids = list(ExerciseEquipment.objects.values_list("pk", flat=True))
        self.seed()
        self.assertEqual(Exercise.objects.count(), 1)
        self.assertEqual(BodyPart.objects.count(), 1)
        self.assertEqual(Equipment.objects.count(), 1)
        self.assertEqual(list(ExerciseBodyPart.objects.values_list("pk", flat=True)), ids)
        self.assertEqual(
            list(ExerciseEquipment.objects.values_list("pk", flat=True)), equipment_ids
        )
        exercise = Exercise.objects.get(pk=self.exercise_id)
        self.assertEqual(str(exercise.body_parts.get().pk), self.part_id)
        self.assertEqual(str(exercise.equipment.get().pk), self.equipment_id)

    def test_updates_catalog_entries_without_deleting_other_data_or_records(self):
        self.seed()
        user = get_user_model().objects.create_user(username="seed-user")
        workout = Workout.objects.create(user=user)
        entry = WorkoutExercise.objects.create(
            workout=workout, exercise_id=self.exercise_id, position=1
        )
        saved_set = WorkoutSet.objects.create(
            workout_exercise=entry, set_number=1, reps=10, weight="20.0"
        )
        other = Exercise.objects.create(display_name="Custom exercise")
        self.catalog["body_parts"][0]["name"] = "Renamed part"
        self.catalog["exercises"][0]["display_name"] = "Renamed exercise"
        self.catalog["exercises"][0]["equipment_ids"] = []
        self.seed()
        self.assertEqual(Exercise.objects.get(pk=self.exercise_id).display_name,
                         "Renamed exercise")
        self.assertEqual(BodyPart.objects.get(pk=self.part_id).name, "Renamed part")
        self.assertFalse(ExerciseEquipment.objects.exists())
        self.assertTrue(Exercise.objects.filter(pk=other.pk).exists())
        self.assertTrue(WorkoutSet.objects.filter(pk=saved_set.pk).exists())

    def test_invalid_catalog_does_not_write_anything(self):
        invalid = [[], {}, {"body_parts": []}]
        for section, field, value in [
            ("exercises", "exercise_id", "bench-press"),
            ("exercises", "display_name", ""),
            ("exercises", "body_part_ids", [str(uuid4())]),
            ("exercises", "equipment_ids", [self.equipment_id, self.equipment_id]),
            ("body_parts", "name", "x" * 101),
        ]:
            data = deepcopy(self.catalog)
            data[section][0][field] = value
            invalid.append(data)
        for section in ["body_parts", "equipment", "exercises"]:
            data = deepcopy(self.catalog)
            data[section].append(deepcopy(data[section][0]))
            invalid.append(data)
        data = deepcopy(self.catalog)
        data["recommendations"]["bench-press"] = str(uuid4())
        invalid.append(data)
        data = deepcopy(self.catalog)
        data["body_parts"].append({"body_part_id": str(uuid4()), "name": "Chest"})
        invalid.append(data)
        for data in invalid:
            with self.subTest(data=data):
                with self.assertRaises(CommandError):
                    self.seed(data)
                self.assertFalse(BodyPart.objects.exists())
                self.assertFalse(Equipment.objects.exists())
                self.assertFalse(Exercise.objects.exists())

    def test_database_name_conflict_rolls_back_all_changes(self):
        Equipment.objects.create(name="Barbell")
        with self.assertRaisesMessage(CommandError, "rolled back"):
            self.seed()
        self.assertFalse(BodyPart.objects.exists())
        self.assertFalse(Exercise.objects.exists())
        self.assertEqual(Equipment.objects.count(), 1)

    def test_file_input_and_read_errors(self):
        with TemporaryDirectory() as directory:
            path = Path(directory) / "catalog.json"
            path.write_text(json.dumps(self.catalog), encoding="utf-8")
            call_command("seed_exercises", str(path), stdout=StringIO())
            self.assertTrue(Exercise.objects.filter(pk=self.exercise_id).exists())
            path.write_text("{", encoding="utf-8")
            with self.assertRaises(CommandError):
                call_command("seed_exercises", str(path))
            with self.assertRaises(CommandError):
                call_command("seed_exercises", str(Path(directory) / "missing.json"))

    def test_malformed_stdin_is_explicit_error(self):
        with patch("note.management.commands.seed_exercises.sys.stdin", StringIO("{")):
            with self.assertRaises(CommandError):
                call_command("seed_exercises", "-")
