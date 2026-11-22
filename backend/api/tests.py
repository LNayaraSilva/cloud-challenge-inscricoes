import json
from datetime import timedelta

from django.test import TestCase, override_settings
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


TOKEN = "token-da-comissao-de-teste"
COMISSAO = {"HTTP_AUTHORIZATION": f"Bearer {TOKEN}"}


@override_settings(COMISSAO_TOKEN=TOKEN)
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
            **COMISSAO,
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
            **COMISSAO,
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
            **COMISSAO,
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


@override_settings(COMISSAO_TOKEN=TOKEN)
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
        # Lista publica: e-mail mascarado e nunca o codigo de cancelamento.
        self.assertEqual(
            response.json()[0]["participante"]["email"],
            "m***@example.com",
        )
        self.assertNotIn("codigo_cancelamento", response.json()[0])

    def test_cancelar_inscricao_libera_vaga(self):
        response = self.inscrever()
        inscricao_id = response.json()["id"]

        cancelamento = self.client.delete(
            reverse(
                "cancelar_inscricao",
                kwargs={"inscricao_id": inscricao_id},
            ),
            HTTP_X_CODIGO_CANCELAMENTO=response.json()["codigo_cancelamento"],
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


@override_settings(COMISSAO_TOKEN=TOKEN)
class SegurancaDasRotasTests(TestCase):
    """Rotas da comissao protegidas por token e protecao contra IDOR no cancelamento."""

    def setUp(self):
        inicio = timezone.now() + timedelta(days=5)
        self.evento = Evento.objects.create(
            titulo="Oficina", descricao="Descrição", palestrante="Professor",
            local="Laboratório", data_inicio=inicio,
            data_fim=inicio + timedelta(hours=2), capacidade=10,
        )

    def dados_evento(self):
        inicio = timezone.now() + timedelta(days=10)
        return {
            "titulo": "Evento", "descricao": "Descrição", "palestrante": "Pessoa",
            "local": "Sala", "data_inicio": inicio.isoformat(),
            "data_fim": (inicio + timedelta(hours=1)).isoformat(), "capacidade": 5,
        }

    def inscrever(self, email):
        return self.client.post(
            reverse("inscricoes_evento", kwargs={"evento_id": self.evento.id}),
            data=json.dumps({"participante": {"nome": "Pessoa", "email": email}}),
            content_type="application/json",
        )

    def cancelar(self, inscricao_id, **cabecalhos):
        return self.client.delete(
            reverse("cancelar_inscricao", kwargs={"inscricao_id": inscricao_id}),
            **cabecalhos,
        )

    # --- Rotas da comissao ----------------------------------------------------

    def test_cadastrar_evento_sem_token_e_recusado(self):
        response = self.client.post(
            reverse("eventos"), data=json.dumps(self.dados_evento()),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json()["erro"], "NAO_AUTORIZADO")
        self.assertEqual(Evento.objects.count(), 1)

    def test_cadastrar_evento_com_token_errado_e_recusado(self):
        response = self.client.post(
            reverse("eventos"), data=json.dumps(self.dados_evento()),
            content_type="application/json", HTTP_AUTHORIZATION="Bearer chute",
        )
        self.assertEqual(response.status_code, 401)

    @override_settings(COMISSAO_TOKEN="")
    def test_sem_token_configurado_a_rota_fica_bloqueada(self):
        response = self.client.post(
            reverse("eventos"), data=json.dumps(self.dados_evento()),
            content_type="application/json", **COMISSAO,
        )
        self.assertEqual(response.status_code, 503)

    def test_consultas_publicas_continuam_abertas(self):
        self.assertEqual(self.client.get(reverse("eventos")).status_code, 200)
        self.assertEqual(self.inscrever("ana@exemplo.com").status_code, 201)

    def test_comissao_ve_o_email_completo(self):
        self.inscrever("ana.souza@exemplo.com")
        url = reverse("inscricoes_evento", kwargs={"evento_id": self.evento.id})
        publico = self.client.get(url).json()[0]["participante"]["email"]
        comissao = self.client.get(url, **COMISSAO).json()[0]["participante"]["email"]
        self.assertEqual(publico, "a***@exemplo.com")
        self.assertEqual(comissao, "ana.souza@exemplo.com")

    # --- IDOR no cancelamento ---------------------------------------------------

    def test_nao_cancela_a_inscricao_de_outra_pessoa_trocando_o_id(self):
        ana = self.inscrever("ana@exemplo.com").json()
        bruno = self.inscrever("bruno@exemplo.com").json()

        # Bruno tenta cancelar a inscricao da Ana usando o PROPRIO codigo.
        response = self.cancelar(ana["id"], HTTP_X_CODIGO_CANCELAMENTO=bruno["codigo_cancelamento"])
        self.assertEqual(response.status_code, 404)
        # Sem codigo nenhum, tambem nao.
        self.assertEqual(self.cancelar(ana["id"]).status_code, 404)
        self.assertTrue(Inscricao.objects.filter(pk=ana["id"]).exists())

    def test_resposta_igual_para_inscricao_alheia_e_inexistente(self):
        ana = self.inscrever("ana@exemplo.com").json()
        alheia = self.cancelar(ana["id"])
        inexistente = self.cancelar(999)
        self.assertEqual(alheia.status_code, inexistente.status_code)
        self.assertEqual(alheia.json(), inexistente.json())

    def test_dono_cancela_com_o_proprio_codigo(self):
        ana = self.inscrever("ana@exemplo.com").json()
        response = self.cancelar(ana["id"], HTTP_X_CODIGO_CANCELAMENTO=ana["codigo_cancelamento"])
        self.assertEqual(response.status_code, 204)
        self.assertFalse(Inscricao.objects.filter(pk=ana["id"]).exists())

    def test_comissao_cancela_qualquer_inscricao(self):
        ana = self.inscrever("ana@exemplo.com").json()
        self.assertEqual(self.cancelar(ana["id"], **COMISSAO).status_code, 204)

    def test_tentativa_de_idor_vai_para_o_log(self):
        ana = self.inscrever("ana@exemplo.com").json()
        with self.assertLogs("api.seguranca", level="WARNING") as log:
            self.cancelar(ana["id"])
        self.assertIn("IDOR bloqueado", log.output[0])
