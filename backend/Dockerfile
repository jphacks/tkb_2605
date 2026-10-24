# syntax=docker/dockerfile:1
FROM python:3.12-slim AS base
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1 PIP_DISABLE_PIP_VERSION_CHECK=1
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
RUN useradd --create-home --uid 1000 app && mkdir -p /data && chown app:app /data

# dev: source is bind-mounted over /app, runserver reloads on change
FROM base AS dev
USER app
ENTRYPOINT ["./entrypoint.sh"]
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]

# prod: code baked in, gunicorn with a single worker (512MB VM).
# No --max-requests: recycling the only worker leaves a gap where nginx returns 502 (seen in the load test).
FROM base AS prod
COPY --chown=app:app . .
RUN DJANGO_DEBUG=1 DJANGO_STATIC_ROOT=/app/staticfiles python manage.py collectstatic --noinput
USER app
ENV DJANGO_DEBUG=0 SQLITE_PATH=/data/db.sqlite3
EXPOSE 8000
ENTRYPOINT ["./entrypoint.sh"]
CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "1", "--threads", "2", "--access-logfile", "-"]
