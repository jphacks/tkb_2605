"""Static API mocks. Requests do not persist data or change subsequent responses."""

from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response


WORKOUT_EXAMPLE = {
    "workout_id": "workout-1",
    "user_id": 1,
    "performed_at": "2026-10-24T16:00:00+09:00",
    "is_completed": False,
}

EXERCISE_EXAMPLE = {
    "workout_exercise_id": "workout-exercise-1",
    "exercise_id": "exercise-1",
    "display_name": "ベンチプレス",
    "position": 1,
}

SETS_EXAMPLE = [
    {
        "workout_set_id": "workout-set-1",
        "set_number": 1,
        "reps": 10,
        "weight": "20.0",
    },
    {
        "workout_set_id": "workout-set-2",
        "set_number": 2,
        "reps": 9,
        "weight": "18.0",
    },
    {
        "workout_set_id": "workout-set-3",
        "set_number": 3,
        "reps": 8,
        "weight": "16.0",
    },
]


@api_view(["POST"])
def create_workout(request):
    return Response(WORKOUT_EXAMPLE, status=status.HTTP_201_CREATED)


@api_view(["POST"])
def add_workout_exercise(request, workout_id: str):
    return Response(
        {**EXERCISE_EXAMPLE, "workout_id": workout_id},
        status=status.HTTP_201_CREATED,
    )


@api_view(["POST"])
def create_workout_sets(request, workout_exercise_id: str):
    return Response(
        {"workout_exercise_id": workout_exercise_id, "sets": SETS_EXAMPLE},
        status=status.HTTP_201_CREATED,
    )


@api_view(["GET", "PATCH"])
def workout_detail(request, workout_id: str):
    workout = {**WORKOUT_EXAMPLE, "workout_id": workout_id}
    if request.method == "PATCH":
        return Response({**workout, "is_completed": True})
    return Response(
        {
            **workout,
            "exercises": [{**EXERCISE_EXAMPLE, "sets": SETS_EXAMPLE}],
        }
    )
