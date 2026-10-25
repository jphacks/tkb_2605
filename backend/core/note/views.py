from django.db import DatabaseError, connection
from rest_framework.decorators import api_view
from rest_framework.response import Response


@api_view(["GET"])
def health(request):
    """Liveness + DB check used by the landing page, compose healthchecks and deploy scripts."""
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
        db = "ok"
    except DatabaseError:
        db = "error"
    status = "ok" if db == "ok" else "error"
    return Response({"status": status, "database": db}, status=200 if status == "ok" else 503)
