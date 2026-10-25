from rest_framework import serializers

from .models import Workout, WorkoutExercise, WorkoutSet


class StrictInputSerializer(serializers.Serializer):
    def to_internal_value(self, data):
        if not isinstance(data, dict):
            raise serializers.ValidationError(
                {"non_field_errors": ["Provide a JSON object."]}
            )
        unknown = set(data) - set(self.fields)
        if unknown:
            raise serializers.ValidationError(
                {field: "Unknown field." for field in sorted(unknown)}
            )
        return super().to_internal_value(data)


class AddExerciseInputSerializer(StrictInputSerializer):
    exercise_id = serializers.UUIDField()


class SetsInputSerializer(StrictInputSerializer):
    # The repository validates each value without coercing JSON types.
    sets = serializers.JSONField()


class CompleteWorkoutInputSerializer(StrictInputSerializer):
    is_completed = serializers.JSONField()

    def validate_is_completed(self, value):
        if value is not True:
            raise serializers.ValidationError("Only true is allowed.")
        return value


class WorkoutSerializer(serializers.ModelSerializer):
    class Meta:
        model = Workout
        fields = ["workout_id", "user_id", "performed_at", "is_completed"]
        read_only_fields = fields


class WorkoutSetSerializer(serializers.ModelSerializer):
    weight = serializers.DecimalField(
        max_digits=6, decimal_places=1, coerce_to_string=True, read_only=True
    )

    class Meta:
        model = WorkoutSet
        fields = ["workout_set_id", "set_number", "reps", "weight"]
        read_only_fields = fields


class WorkoutExerciseSerializer(serializers.ModelSerializer):
    display_name = serializers.CharField(source="exercise.display_name", read_only=True)

    class Meta:
        model = WorkoutExercise
        fields = [
            "workout_exercise_id", "workout_id", "exercise_id", "display_name", "position",
        ]
        read_only_fields = fields


class WorkoutExerciseDetailSerializer(WorkoutExerciseSerializer):
    sets = WorkoutSetSerializer(many=True, read_only=True)

    class Meta(WorkoutExerciseSerializer.Meta):
        fields = [
            "workout_exercise_id", "exercise_id", "display_name", "position", "sets",
        ]
        read_only_fields = fields


class WorkoutDetailSerializer(WorkoutSerializer):
    exercises = WorkoutExerciseDetailSerializer(many=True, read_only=True)

    class Meta(WorkoutSerializer.Meta):
        fields = WorkoutSerializer.Meta.fields + ["exercises"]
        read_only_fields = fields
