import uuid
from decimal import Decimal

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models
from django.utils import timezone


class Workout(models.Model):
    workout_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="workouts"
    )
    performed_at = models.DateTimeField(default=timezone.now)
    is_completed = models.BooleanField(default=False)

    class Meta:
        db_table = "workouts"


class BodyPart(models.Model):
    body_part_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True)

    class Meta:
        db_table = "body_parts"


class Equipment(models.Model):
    equipment_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True)

    class Meta:
        db_table = "equipment"


class Exercise(models.Model):
    exercise_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    display_name = models.CharField(max_length=100)
    body_parts = models.ManyToManyField(
        BodyPart, through="ExerciseBodyPart", related_name="exercises"
    )
    equipment = models.ManyToManyField(
        Equipment, through="ExerciseEquipment", related_name="exercises"
    )

    class Meta:
        db_table = "exercises"


class ExerciseBodyPart(models.Model):
    exercise = models.ForeignKey(Exercise, on_delete=models.CASCADE)
    body_part = models.ForeignKey(BodyPart, on_delete=models.CASCADE)

    class Meta:
        db_table = "exercise_body_parts"
        constraints = [
            models.UniqueConstraint(
                fields=["exercise", "body_part"], name="unique_exercise_body_part"
            ),
        ]


class ExerciseEquipment(models.Model):
    exercise = models.ForeignKey(Exercise, on_delete=models.CASCADE)
    equipment = models.ForeignKey(Equipment, on_delete=models.CASCADE)

    class Meta:
        db_table = "exercise_equipment"
        constraints = [
            models.UniqueConstraint(
                fields=["exercise", "equipment"], name="unique_exercise_equipment"
            ),
        ]


class WorkoutExercise(models.Model):
    workout_exercise_id = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False
    )
    workout = models.ForeignKey(
        Workout, on_delete=models.CASCADE, related_name="exercises"
    )
    exercise = models.ForeignKey(Exercise, on_delete=models.PROTECT)
    position = models.PositiveIntegerField(validators=[MinValueValidator(1)])

    class Meta:
        db_table = "workout_exercises"
        ordering = ["position"]
        constraints = [
            models.UniqueConstraint(
                fields=["workout", "position"], name="unique_workout_position"
            ),
            models.CheckConstraint(
                condition=models.Q(position__gte=1), name="workout_position_gte_1"
            ),
        ]


class WorkoutSet(models.Model):
    workout_set_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workout_exercise = models.ForeignKey(
        WorkoutExercise, on_delete=models.CASCADE, related_name="sets"
    )
    set_number = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    reps = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    weight = models.DecimalField(
        max_digits=6, decimal_places=1, validators=[MinValueValidator(Decimal("0"))]
    )

    class Meta:
        db_table = "workouts_sets"
        ordering = ["set_number"]
        constraints = [
            models.UniqueConstraint(
                fields=["workout_exercise", "set_number"],
                name="unique_workout_exercise_set",
            ),
            models.CheckConstraint(
                condition=models.Q(set_number__gte=1), name="workout_set_number_gte_1"
            ),
            models.CheckConstraint(
                condition=models.Q(reps__gte=1), name="workout_set_reps_gte_1"
            ),
            models.CheckConstraint(
                condition=models.Q(weight__gte=0), name="workout_set_weight_gte_0"
            ),
        ]