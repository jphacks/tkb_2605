from contextlib import contextmanager

from django.core.exceptions import ValidationError as ModelValidationError
from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.exceptions import APIException, NotFound, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from . import repositories
from .models import Exercise, Workout, WorkoutExercise
from .serializers import (
    AddExerciseInputSerializer,
    CompleteWorkoutInputSerializer,
    SetsInputSerializer,
    StrictInputSerializer,
    WorkoutDetailSerializer,
    WorkoutExerciseSerializer,
    WorkoutSerializer,
    WorkoutSetSerializer,
)


class WorkoutConflict(APIException):
    status_code = status.HTTP_409_CONFLICT
    default_detail = "Completed workouts cannot be modified."
    default_code = "workout_completed"


@contextmanager
def repository_errors():
    try:
        yield
    except (Workout.DoesNotExist, WorkoutExercise.DoesNotExist, Exercise.DoesNotExist) as exc:
        raise NotFound("Record or exercise not found.") from exc
    except ModelValidationError as exc:
        if getattr(exc, "code", None) == "workout_completed":
            raise WorkoutConflict() from exc
        detail = exc.message_dict if hasattr(exc, "message_dict") else exc.messages
        raise ValidationError(detail) from exc


@api_view(["POST"])
@authentication_classes([SessionAuthentication])
@permission_classes([IsAuthenticated])
def create_workout(request):
    serializer = StrictInputSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    with repository_errors():
        workout = repositories.create_workout(request.user.pk)
    return Response(WorkoutSerializer(workout).data, status=status.HTTP_201_CREATED)


@api_view(["POST"])
@authentication_classes([SessionAuthentication])
@permission_classes([IsAuthenticated])
def add_workout_exercise(request, workout_id: str):
    serializer = AddExerciseInputSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    with repository_errors():
        exercise = repositories.add_workout_exercise(
            request.user.pk, workout_id, serializer.validated_data["exercise_id"]
        )
    return Response(
        WorkoutExerciseSerializer(exercise).data, status=status.HTTP_201_CREATED
    )


@api_view(["POST"])
@authentication_classes([SessionAuthentication])
@permission_classes([IsAuthenticated])
def create_workout_sets(request, workout_exercise_id: str):
    serializer = SetsInputSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    with repository_errors():
        sets = repositories.create_workout_sets(
            request.user.pk, workout_exercise_id, serializer.validated_data["sets"]
        )
    return Response(
        {
            "workout_exercise_id": str(sets[0].workout_exercise_id),
            "sets": WorkoutSetSerializer(sets, many=True).data,
        },
        status=status.HTTP_201_CREATED,
    )


@api_view(["GET", "PATCH"])
@authentication_classes([SessionAuthentication])
@permission_classes([IsAuthenticated])
def workout_detail(request, workout_id: str):
    if request.method == "PATCH":
        serializer = CompleteWorkoutInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        with repository_errors():
            workout = repositories.complete_workout(request.user.pk, workout_id)
        return Response(WorkoutSerializer(workout).data)
    with repository_errors():
        workout = repositories.get_workout_detail(request.user.pk, workout_id)
    return Response(WorkoutDetailSerializer(workout).data)
