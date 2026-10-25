from django.urls import path

from . import views

app_name = "note"

urlpatterns = [
    path("workouts/", views.create_workout, name="create_workout"),
    path(
        "workouts/<str:workout_id>/exercises/",
        views.add_workout_exercise,
        name="add_workout_exercise",
    ),
    path(
        "workout-exercises/<str:workout_exercise_id>/sets/",
        views.create_workout_sets,
        name="create_workout_sets",
    ),
    path(
        "workouts/<str:workout_id>/",
        views.workout_detail,
        name="workout_detail",
    ),
]
