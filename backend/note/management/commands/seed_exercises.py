import json
import sys
from pathlib import Path
from uuid import UUID

from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand, CommandError
from django.db import IntegrityError, transaction

from note.models import BodyPart, Equipment, Exercise


def parse_uuid(value):
    if not isinstance(value, str):
        raise ValueError("IDs must be UUID strings.")
    return UUID(value)


def master_rows(data, key, id_field, name_field):
    rows = data.get(key)
    if not isinstance(rows, list) or not rows:
        raise ValueError(f"{key} must be a non-empty array.")
    result = {}
    names = set()
    for row in rows:
        if not isinstance(row, dict):
            raise ValueError(f"{key} entries must be objects.")
        pk = parse_uuid(row.get(id_field))
        name = row.get(name_field)
        if not isinstance(name, str) or not name.strip() or len(name) > 100:
            raise ValueError(f"{key}.{name_field} must contain 1 to 100 characters.")
        if pk in result:
            raise ValueError(f"Duplicate ID in {key}: {pk}")
        if key != "exercises" and name in names:
            raise ValueError(f"Duplicate name in {key}: {name}")
        names.add(name)
        result[pk] = {**row, id_field: pk}
    return result


def references(row, key, master):
    values = row.get(key)
    if not isinstance(values, list):
        raise ValueError(f"{key} must be an array.")
    ids = [parse_uuid(value) for value in values]
    if len(set(ids)) != len(ids) or any(pk not in master for pk in ids):
        raise ValueError(f"{key} contains duplicate or unknown IDs.")
    return ids


def validate_catalog(data):
    if not isinstance(data, dict):
        raise ValueError("Catalog must be a JSON object.")
    parts = master_rows(data, "body_parts", "body_part_id", "name")
    equipment = master_rows(data, "equipment", "equipment_id", "name")
    exercises = master_rows(data, "exercises", "exercise_id", "display_name")
    for row in exercises.values():
        row["body_part_ids"] = references(row, "body_part_ids", parts)
        row["equipment_ids"] = references(row, "equipment_ids", equipment)
    recommendations = data.get("recommendations")
    if not isinstance(recommendations, dict):
        raise ValueError("recommendations must be an object.")
    for key, value in recommendations.items():
        if not key.strip() or parse_uuid(value) not in exercises:
            raise ValueError("recommendations contains an unknown exercise.")
    return parts, equipment, exercises


def upsert(model, pk, defaults):
    obj, _ = model.objects.get_or_create(pk=pk, defaults=defaults)
    for field, value in defaults.items():
        setattr(obj, field, value)
    obj.full_clean()
    obj.save()
    return obj


class Command(BaseCommand):
    help = "Seed exercise masters from the frontend UUID catalog without deleting records."

    def add_arguments(self, parser):
        parser.add_argument("catalog", help="Catalog JSON path, or - for standard input.")

    def handle(self, *args, **options):
        try:
            if options["catalog"] == "-":
                data = json.load(sys.stdin)
            else:
                data = json.loads(Path(options["catalog"]).read_text(encoding="utf-8"))
            parts, equipment, exercises = validate_catalog(data)
        except (OSError, ValueError) as exc:
            raise CommandError(f"Invalid exercise catalog: {exc}") from exc

        try:
            with transaction.atomic():
                for pk, row in parts.items():
                    upsert(BodyPart, pk, {"name": row["name"]})
                for pk, row in equipment.items():
                    upsert(Equipment, pk, {"name": row["name"]})
                for pk, row in exercises.items():
                    exercise = upsert(Exercise, pk, {"display_name": row["display_name"]})
                    exercise.body_parts.set(row["body_part_ids"])
                    exercise.equipment.set(row["equipment_ids"])
        except (ValidationError, IntegrityError) as exc:
            raise CommandError(f"Exercise seed rolled back: {exc}") from exc

        self.stdout.write(self.style.SUCCESS(
            f"Seeded {len(exercises)} exercises, {len(parts)} body parts, "
            f"{len(equipment)} equipment entries and their relationships."
        ))
