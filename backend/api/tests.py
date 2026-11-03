from django.test import TestCase
from django.urls import reverse


class HealthEndpointTests(TestCase):
    def test_health_retorna_status_ok(self):
        response = self.client.get(reverse("health"))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok"})
        self.assertEqual(
            response.headers["Content-Type"],
            "application/json",
        )

    def test_health_rejeita_metodo_post(self):
        response = self.client.post(reverse("health"))

        self.assertEqual(response.status_code, 405)