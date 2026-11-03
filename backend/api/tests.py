import json
from datetime import timedelta

from django.test import TestCase
from django.urls import reverse
from django.utils import timezone

from .models import Evento, Inscricao


class HealthEndpointTests(TestCase):
    def test_health_retorna_status_ok(self):
        response = self.client.get(reverse("health"))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok"})

    def test_health_rejeita_metodo_post(self):
        response = self.client.post(reverse("health"))

        self.assertEqual(response.status_code, 405)


class EventosEndpointTests(TestCase):
    def dados_evento(self):
        inicio = timezone.now() + timedelta(days=10)
        fim = inicio + timedelta(hours=2)

        return {
            "titulo": "Oficina de Python",
            "descricao": "Introdução à programação com Python",
            "palestrante": "Professor convidado",
            "local": "Laboratório 01",
            "data_inicio": inicio.isoformat(),
            "data_fim": fim.isoformat(),
            "capacidade": 30,
        }

    def test_cadastrar_evento(self):
        response = self.client.post(
            reverse("eventos"),
            data=json.dumps(self.dados_evento()),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(Evento.objects.count(), 1)
        self.assertEqual(
            response.json()["titulo"],
            "Oficina de Python",
        )
        self.assertEqual(
            response.json()["vagas_disponiveis"],
            30,
        )

    def test_rejeitar_evento_com_capacidade_invalida(self):
        dados = self.dados_evento()
        dados["capacidade"] = 0

        response = self.client.post(
            reverse("eventos"),
            data=json.dumps(dados),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.json()["erro"],
            "DADOS_INVALIDOS",
        )

    def test_rejeitar_data_sem_fuso_horario(self):
        dados = self.dados_evento()
        dados["data_inicio"] = "2026-11-10T19:00:00"

        response = self.client.post(
            reverse("eventos"),
            data=json.dumps(dados),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn(
            "data_inicio",
            response.json()["campos"],
        )

    def test_listar_eventos_com_vagas_disponiveis(self):
        evento = Evento.objects.create(
            titulo="Evento",
            descricao="Descrição",
            palestrante="Palestrante",
            local="Auditório",
            data_inicio=timezone.now() + timedelta(days=5),
            data_fim=timezone.now() + timedelta(days=5, hours=2),
            capacidade=2,
        )
        Inscricao.objects.create(
            evento=evento,
            participante_nome="Maria",
            participante_email="maria@example.com",
        )

        response = self.client.get(reverse("eventos"))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 1)
        self.assertEqual(
            response.json()[0]["vagas_disponiveis"],
            1,
        )

    def test_consultar_evento_inexistente(self):
        response = self.client.get(
            reverse(
                "detalhe_evento",
                kwargs={"evento_id": 999},
            )
        )

        self.assertEqual(response.status_code, 404)
        self.assertEqual(
            response.json()["erro"],
            "EVENTO_NAO_ENCONTRADO",
        )


class InscricoesEndpointTests(TestCase):
    def setUp(self):
        inicio = timezone.now() + timedelta(days=5)

        self.evento = Evento.objects.create(
            titulo="Oficina",
            descricao="Descrição da oficina",
            palestrante="Professor",
            local="Laboratório",
            data_inicio=inicio,
            data_fim=inicio + timedelta(hours=2),
            capacidade=1,
        )

    def url_inscricoes(self, evento=None):
        evento = evento or self.evento

        return reverse(
            "inscricoes_evento",
            kwargs={"evento_id": evento.id},
        )

    def dados_participante(
        self,
        nome="Maria Silva",
        email="maria@example.com",
    ):
        return {
            "participante": {
                "nome": nome,
                "email": email,
            }
        }

    def inscrever(
        self,
        nome="Maria Silva",
        email="maria@example.com",
        evento=None,
    ):
        return self.client.post(
            self.url_inscricoes(evento),
            data=json.dumps(
                self.dados_participante(nome, email)
            ),
            content_type="application/json",
        )

    def test_realizar_inscricao(self):
        response = self.inscrever()

        self.assertEqual(response.status_code, 201)
        self.assertEqual(Inscricao.objects.count(), 1)
        self.assertEqual(
            response.json()["status"],
            "confirmada",
        )
        self.assertEqual(
            response.json()["participante"]["email"],
            "maria@example.com",
        )

    def test_rejeitar_inscricao_duplicada(self):
        primeira = self.inscrever()
        segunda = self.inscrever(
            nome="Outra Maria",
            email="MARIA@example.com",
        )

        self.assertEqual(primeira.status_code, 201)
        self.assertEqual(segunda.status_code, 409)
        self.assertEqual(
            segunda.json()["erro"],
            "INSCRICAO_DUPLICADA",
        )
        self.assertEqual(Inscricao.objects.count(), 1)

    def test_rejeitar_inscricao_sem_vaga(self):
        primeira = self.inscrever()
        segunda = self.inscrever(
            nome="João",
            email="joao@example.com",
        )

        self.assertEqual(primeira.status_code, 201)
        self.assertEqual(segunda.status_code, 409)
        self.assertEqual(
            segunda.json()["erro"],
            "VAGAS_ESGOTADAS",
        )

    def test_rejeitar_inscricao_em_evento_iniciado(self):
        inicio = timezone.now() - timedelta(hours=2)
        evento_passado = Evento.objects.create(
            titulo="Evento iniciado",
            descricao="Descrição",
            palestrante="Professor",
            local="Auditório",
            data_inicio=inicio,
            data_fim=inicio + timedelta(hours=1),
            capacidade=10,
        )

        response = self.inscrever(evento=evento_passado)

        self.assertEqual(response.status_code, 422)
        self.assertEqual(
            response.json()["erro"],
            "EVENTO_INICIADO",
        )

    def test_listar_inscricoes_do_evento(self):
        self.inscrever()

        response = self.client.get(
            self.url_inscricoes()
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 1)
        self.assertEqual(
            response.json()[0]["participante"]["nome"],
            "Maria Silva",
        )

    def test_cancelar_inscricao_libera_vaga(self):
        response = self.inscrever()
        inscricao_id = response.json()["id"]

        cancelamento = self.client.delete(
            reverse(
                "cancelar_inscricao",
                kwargs={"inscricao_id": inscricao_id},
            )
        )

        nova_inscricao = self.inscrever(
            nome="João",
            email="joao@example.com",
        )

        self.assertEqual(cancelamento.status_code, 204)
        self.assertEqual(nova_inscricao.status_code, 201)
        self.assertEqual(Inscricao.objects.count(), 1)

    def test_cancelar_inscricao_inexistente(self):
        response = self.client.delete(
            reverse(
                "cancelar_inscricao",
                kwargs={"inscricao_id": 999},
            )
        )

        self.assertEqual(response.status_code, 404)
        self.assertEqual(
            response.json()["erro"],
            "INSCRICAO_NAO_ENCONTRADA",
        )