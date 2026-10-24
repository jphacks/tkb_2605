from unittest import mock

from django.db import DatabaseError
from django.test import TestCase


class HealthTests(TestCase):
    def test_ok(self):
        res = self.client.get("/api/health/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json(), {"status": "ok", "database": "ok"})

    def test_database_error(self):
        with mock.patch("core.views.connection.cursor", side_effect=DatabaseError("down")):
            res = self.client.get("/api/health/")
        self.assertEqual(res.status_code, 503)
        self.assertEqual(res.json(), {"status": "error", "database": "error"})
