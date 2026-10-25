import re
from typing import TypedDict
from uuid import UUID

from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Max, Prefetch

from .models import Exercise, Workout, WorkoutExercise, WorkoutSet


class WorkoutSetInput(TypedDict):
    set_number: int
    reps: int
    weight: str


def _require_in_progress(workout: Workout) -> None:
    if workout.is_completed:
        raise ValidationError(
            "Completed workouts cannot be modified.", code="workout_completed"
        )


def create_workout(user_id: int) -> Workout:
    workout = Workout(user_id=user_id)
    workout.full_clean()
    workout.save()
    return workout


@transaction.atomic
def add_workout_exercise(
    user_id: int, workout_id: UUID | str, exercise_id: UUID | str
) -> WorkoutExercise:
    workout = Workout.objects.select_for_update().get(
        workout_id=workout_id, user_id=user_id
    )
    _require_in_progress(workout)
    exercise = Exercise.objects.get(exercise_id=exercise_id)
    last_position = workout.exercises.aggregate(value=Max("position"))["value"]
    workout_exercise = WorkoutExercise(
        workout=workout, exercise=exercise, position=(last_position or 0) + 1
    )
    workout_exercise.full_clean()
    workout_exercise.save()
    return workout_exercise


@transaction.atomic
def create_workout_sets(
    user_id: int,
    workout_exercise_id: UUID | str,
    sets: list[WorkoutSetInput],
) -> list[WorkoutSet]:
    """Replace all sets atomically, returning the new rows in set-number order."""
    workout_exercise = WorkoutExercise.objects.get(
        workout_exercise_id=workout_exercise_id, workout__user_id=user_id
    )
    # All writes lock the parent workout, including completion and set replacement.
    workout = Workout.objects.select_for_update().get(
        workout_id=workout_exercise.workout_id, user_id=user_id
    )
    _require_in_progress(workout)
    if not isinstance(sets, list) or not sets:
        raise ValidationError({"sets": "Provide at least one set."})

    rows = []
    numbers = set()
    for item in sets:
        if not isinstance(item, dict) or set(item) != {"set_number", "reps", "weight"}:
            raise ValidationError(
                {"sets": "Each set must contain set_number, reps and weight only."}
            )
        for field in ("set_number", "reps"):
            if type(item[field]) is not int or item[field] < 1:
                raise ValidationError({field: "Provide an integer greater than zero."})
        if not isinstance(item["weight"], str) or not re.fullmatch(
            r"[0-9]+(?:\.[0-9])?", item["weight"]
        ):
            raise ValidationError(
                {"weight": "Provide a non-negative decimal string with at most one decimal place."}
            )
        if item["set_number"] in numbers:
            raise ValidationError({"set_number": "Set numbers must be unique."})
        numbers.add(item["set_number"])
        row = WorkoutSet(workout_exercise=workout_exercise, **item)
        # Existing rows are being replaced; validate fields before deleting anything.
        row.full_clean(validate_unique=False, validate_constraints=False)
        rows.append(row)

    workout_exercise.sets.all().delete()
    rows.sort(key=lambda row: row.set_number)
    return WorkoutSet.objects.bulk_create(rows)


def get_workout_detail(user_id: int, workout_id: UUID | str) -> Workout:
    exercises = WorkoutExercise.objects.select_related("exercise").prefetch_related(
        "sets"
    )
    return Workout.objects.prefetch_related(
        Prefetch("exercises", queryset=exercises)
    ).get(workout_id=workout_id)


@transaction.atomic
def complete_workout(user_id: int, workout_id: UUID | str) -> Workout:
    workout = Workout.objects.select_for_update().get(
        workout_id=workout_id, user_id=user_id
    )
    if not workout.is_completed:
        workout.is_completed = True
        workout.save(update_fields=["is_completed"])
    return workout
