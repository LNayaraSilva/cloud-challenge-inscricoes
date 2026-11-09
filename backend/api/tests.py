import json
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import Client, TestCase, override_settings
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
    def test_health_permite_frontend_local(self):
        response = self.client.get(
            reverse("health"),
            HTTP_ORIGIN="http://localhost:5173",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.headers["Access-Control-Allow-Origin"],
            "http://localhost:5173",
        )


class EventosEndpointTests(TestCase):
    def setUp(self):
        self.staff = get_user_model().objects.create_user(
            username="organizador", password="senha-para-teste", is_staff=True
        )

    def entrar_como_organizador(self):
        self.client.force_login(self.staff)

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
        self.entrar_como_organizador()
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
        self.entrar_como_organizador()
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
        self.entrar_como_organizador()
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

    def test_publico_nao_cadastra_evento(self):
        resposta = self.client.post(
            reverse("eventos"),
            data=json.dumps(self.dados_evento()),
            content_type="application/json",
        )
        self.assertEqual(resposta.status_code, 403)
        self.assertEqual(Evento.objects.count(), 0)

    def test_criacao_exige_csrf_para_staff(self):
        cliente = Client(enforce_csrf_checks=True)
        cliente.force_login(self.staff)
        resposta = cliente.post(
            reverse("eventos"),
            data=json.dumps(self.dados_evento()),
            content_type="application/json",
        )
        self.assertEqual(resposta.status_code, 403)
        self.assertEqual(Evento.objects.count(), 0)

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
        self.staff = get_user_model().objects.create_user(
            username="organizador", password="senha-para-teste", is_staff=True
        )
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

    def entrar_como_organizador(self):
        self.client.force_login(self.staff)

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
        self.entrar_como_organizador()

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
        self.entrar_como_organizador()
        inscricao_id = response.json()["id"]

        cancelamento = self.client.delete(
            reverse(
                "cancelar_inscricao",
                kwargs={"inscricao_id": inscricao_id},
            )
        )

        self.client.logout()
        nova_inscricao = self.inscrever(
            nome="João",
            email="joao@example.com",
        )

        self.assertEqual(cancelamento.status_code, 204)
        self.assertEqual(nova_inscricao.status_code, 201)
        self.assertEqual(Inscricao.objects.count(), 1)

    def test_cancelar_inscricao_inexistente(self):
        self.entrar_como_organizador()
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

@override_settings(
        STORAGES={
        "default": {
            "BACKEND": "django.core.files.storage.FileSystemStorage"
        },
        "staticfiles": {
            "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"
        },
         }
           )

class PermissoesEFrontendTests(TestCase):
      def setUp(self):
        self.staff = get_user_model().objects.create_user(
            username="equipe", password="senha-para-teste", is_staff=True
        )
        self.participante = get_user_model().objects.create_user(
            username="visitante", password="senha-para-teste", is_staff=False
        )
        inicio = timezone.now() + timedelta(days=2)
        self.evento = Evento.objects.create(
            titulo="Oficina teste", descricao="Descrição de teste",
            palestrante="Pessoa docente", local="Auditório",
            data_inicio=inicio, data_fim=inicio + timedelta(hours=2),
            capacidade=10,
        )
        self.inscricao = Inscricao.objects.create(
            evento=self.evento, participante_nome="Maria",
            participante_email="maria@example.com",
        )

      def test_pagina_publica_renderiza_template(self):
        resposta = self.client.get(reverse("home"))
        self.assertEqual(resposta.status_code, 200)
        self.assertContains(resposta, "Semana Acadêmica")
        self.assertContains(resposta, "/static/frontend/script.js")

      def test_painel_redireciona_visitante_para_login(self):
        resposta = self.client.get(reverse("organizacao"))
        self.assertEqual(resposta.status_code, 302)
        self.assertIn("/admin/login/", resposta["Location"])

      def test_painel_proibe_usuario_comum(self):
        self.client.force_login(self.participante)
        resposta = self.client.get(reverse("organizacao"))
        self.assertEqual(resposta.status_code, 302)

      def test_painel_permite_organizador(self):
        self.client.force_login(self.staff)
        resposta = self.client.get(reverse("organizacao"))
        self.assertEqual(resposta.status_code, 200)
        self.assertContains(resposta, "Inscrições por evento")

      def test_api_nao_vaza_email_a_visitante(self):
        url = reverse("inscricoes_evento", kwargs={"evento_id": self.evento.id})
        resposta = self.client.get(url)
        self.assertEqual(resposta.status_code, 403)
        self.assertNotIn("maria@example.com", resposta.content.decode())
        self.client.force_login(self.participante)
        self.assertEqual(self.client.get(url).status_code, 403)

      def test_organizador_pode_consultar_inscritos(self):
        self.client.force_login(self.staff)
        url = reverse("inscricoes_evento", kwargs={"evento_id": self.evento.id})
        resposta = self.client.get(url)
        self.assertEqual(resposta.status_code, 200)
        self.assertEqual(resposta.json()[0]["participante"]["email"], "maria@example.com")

      def test_visitante_nao_pode_cancelar_inscricao(self):
        url = reverse("cancelar_inscricao", kwargs={"inscricao_id": self.inscricao.id})
        resposta = self.client.delete(url)
        self.assertEqual(resposta.status_code, 403)
        self.assertTrue(Inscricao.objects.filter(pk=self.inscricao.id).exists())

      def test_cancelamento_staff_exige_csrf(self):
        cliente = Client(enforce_csrf_checks=True)
        cliente.force_login(self.staff)
        url = reverse("cancelar_inscricao", kwargs={"inscricao_id": self.inscricao.id})
        resposta = cliente.delete(url)
        self.assertEqual(resposta.status_code, 403)
        self.assertTrue(Inscricao.objects.filter(pk=self.inscricao.id).exists())
