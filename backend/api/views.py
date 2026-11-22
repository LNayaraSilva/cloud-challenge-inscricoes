import json
import logging
from json import JSONDecodeError

from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.db import IntegrityError, transaction
from django.db.models import Count, Q
from django.http import HttpResponse, JsonResponse
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_http_methods

from .models import Evento, Inscricao
from .seguranca import codigo_confere, eh_comissao, verificar_comissao
from .serializers import evento_para_dict, inscricao_para_dict

logger = logging.getLogger("api.seguranca")


def resposta_erro(codigo, mensagem, status, campos=None):
    resposta = {
        "erro": codigo,
        "mensagem": mensagem,
    }

    if campos:
        resposta["campos"] = campos

    return JsonResponse(resposta, status=status)


def ler_json(request):
    try:
        dados = json.loads(request.body)
    except (JSONDecodeError, UnicodeDecodeError):
        return None, resposta_erro(
            "JSON_INVALIDO",
            "O corpo da requisição deve conter um JSON válido.",
            400,
        )

    if not isinstance(dados, dict):
        return None, resposta_erro(
            "JSON_INVALIDO",
            "O corpo da requisição deve ser um objeto JSON.",
            400,
        )

    return dados, None


def validar_evento(dados):
    campos_texto = [
        "titulo",
        "descricao",
        "palestrante",
        "local",
    ]
    erros = {}

    for campo in campos_texto:
        valor = dados.get(campo)

        if not isinstance(valor, str) or not valor.strip():
            erros[campo] = "Este campo é obrigatório."

    capacidade = dados.get("capacidade")

    if (
        isinstance(capacidade, bool)
        or not isinstance(capacidade, int)
        or capacidade < 1
    ):
        erros["capacidade"] = (
            "A capacidade deve ser um número inteiro maior que zero."
        )

    datas = {}

    for campo in ["data_inicio", "data_fim"]:
        valor = dados.get(campo)

        if not isinstance(valor, str):
            erros[campo] = "Informe uma data no formato ISO 8601."
            continue

        data = parse_datetime(valor)

        if data is None or timezone.is_naive(data):
            erros[campo] = (
                "Informe uma data ISO 8601 com fuso horário."
            )
            continue

        datas[campo] = data

    if (
        "data_inicio" in datas
        and "data_fim" in datas
        and datas["data_fim"] <= datas["data_inicio"]
    ):
        erros["data_fim"] = (
            "A data de término deve ser posterior à data de início."
        )

    if erros:
        return None, erros

    evento = Evento(
        titulo=dados["titulo"].strip(),
        descricao=dados["descricao"].strip(),
        palestrante=dados["palestrante"].strip(),
        local=dados["local"].strip(),
        data_inicio=datas["data_inicio"],
        data_fim=datas["data_fim"],
        capacidade=capacidade,
    )

    return evento, None


def validar_participante(dados):
    participante = dados.get("participante")

    if not isinstance(participante, dict):
        return None, {
            "participante": "Informe os dados do participante."
        }

    nome = participante.get("nome")
    email = participante.get("email")
    erros = {}

    if not isinstance(nome, str) or not nome.strip():
        erros["participante.nome"] = "O nome é obrigatório."

    if not isinstance(email, str) or not email.strip():
        erros["participante.email"] = "O e-mail é obrigatório."
    else:
        email = email.strip().lower()

        try:
            validate_email(email)
        except ValidationError:
            erros["participante.email"] = "Informe um e-mail válido."

    if erros:
        return None, erros

    return {
        "nome": nome.strip(),
        "email": email,
    }, None


@require_GET
def health(request):
    return JsonResponse({"status": "ok"})


@csrf_exempt
@require_http_methods(["GET", "POST"])
def eventos(request):
    if request.method == "GET":
        lista = Evento.objects.annotate(
            total_inscricoes_confirmadas=Count(
                "inscricoes",
                filter=Q(
                    inscricoes__status=Inscricao.Status.CONFIRMADA
                ),
            )
        )

        return JsonResponse(
            [evento_para_dict(evento) for evento in lista],
            safe=False,
        )

    # Cadastrar evento e tarefa da comissao organizadora.
    bloqueio = verificar_comissao(request)

    if bloqueio:
        return bloqueio

    dados, erro = ler_json(request)

    if erro:
        return erro

    evento, erros = validar_evento(dados)

    if erros:
        return resposta_erro(
            "DADOS_INVALIDOS",
            "Os dados do evento são inválidos.",
            400,
            erros,
        )

    try:
        evento.full_clean()
    except ValidationError as erro:
        return resposta_erro(
            "DADOS_INVALIDOS",
            "Os dados do evento são inválidos.",
            400,
            erro.message_dict,
        )

    evento.save()

    return JsonResponse(
        evento_para_dict(evento),
        status=201,
    )


@require_GET
def detalhe_evento(request, evento_id):
    try:
        evento = (
            Evento.objects
            .annotate(
                total_inscricoes_confirmadas=Count(
                    "inscricoes",
                    filter=Q(
                        inscricoes__status=(
                            Inscricao.Status.CONFIRMADA
                        )
                    ),
                )
            )
            .get(pk=evento_id)
        )
    except Evento.DoesNotExist:
        return resposta_erro(
            "EVENTO_NAO_ENCONTRADO",
            "Evento não encontrado.",
            404,
        )

    return JsonResponse(evento_para_dict(evento))


@csrf_exempt
@require_http_methods(["GET", "POST"])
def inscricoes_evento(request, evento_id):
    if request.method == "GET":
        if not Evento.objects.filter(pk=evento_id).exists():
            return resposta_erro(
                "EVENTO_NAO_ENCONTRADO",
                "Evento não encontrado.",
                404,
            )

        inscricoes = Inscricao.objects.filter(
            evento_id=evento_id
        )

        # Lista publica: nome e e-mail MASCARADO (dado pessoal).
        # Com o token da comissao: e-mail completo.
        email_completo = eh_comissao(request)

        return JsonResponse(
            [
                inscricao_para_dict(inscricao, email_completo)
                for inscricao in inscricoes
            ],
            safe=False,
        )

    dados, erro = ler_json(request)

    if erro:
        return erro

    participante, erros = validar_participante(dados)

    if erros:
        return resposta_erro(
            "DADOS_INVALIDOS",
            "Os dados do participante são inválidos.",
            400,
            erros,
        )

    try:
        with transaction.atomic():
            try:
                evento = (
                    Evento.objects
                    .select_for_update()
                    .get(pk=evento_id)
                )
            except Evento.DoesNotExist:
                return resposta_erro(
                    "EVENTO_NAO_ENCONTRADO",
                    "Evento não encontrado.",
                    404,
                )

            if evento.data_inicio <= timezone.now():
                return resposta_erro(
                    "EVENTO_INICIADO",
                    "Não é possível se inscrever em um evento iniciado.",
                    422,
                )

            if Inscricao.objects.filter(
                evento=evento,
                participante_email__iexact=participante["email"],
            ).exists():
                return resposta_erro(
                    "INSCRICAO_DUPLICADA",
                    "Este e-mail já está inscrito no evento.",
                    409,
                )

            total_confirmadas = Inscricao.objects.filter(
                evento=evento,
                status=Inscricao.Status.CONFIRMADA,
            ).count()

            if total_confirmadas >= evento.capacidade:
                return resposta_erro(
                    "VAGAS_ESGOTADAS",
                    "Não existem vagas disponíveis para este evento.",
                    409,
                )

            inscricao = Inscricao.objects.create(
                evento=evento,
                participante_nome=participante["nome"],
                participante_email=participante["email"],
            )

    except IntegrityError:
        return resposta_erro(
            "INSCRICAO_DUPLICADA",
            "Este e-mail já está inscrito no evento.",
            409,
        )

    # So aqui o codigo de cancelamento e devolvido: quem se inscreveu guarda
    # para poder cancelar depois (protecao contra IDOR).
    resposta = inscricao_para_dict(inscricao)
    resposta["codigo_cancelamento"] = str(inscricao.codigo_cancelamento)

    return JsonResponse(resposta, status=201)


@csrf_exempt
@require_http_methods(["DELETE"])
def cancelar_inscricao(request, inscricao_id):
    nao_encontrada = resposta_erro(
        "INSCRICAO_NAO_ENCONTRADA",
        "Inscrição não encontrada.",
        404,
    )

    try:
        inscricao = Inscricao.objects.get(pk=inscricao_id)
    except Inscricao.DoesNotExist:
        return nao_encontrada

    # PROTECAO CONTRA IDOR: so cancela quem tem o codigo desta inscricao
    # (recebido na hora de se inscrever) ou a comissao. Sem isso, qualquer
    # pessoa cancelaria a inscricao dos outros trocando o numero na URL.
    codigo = request.headers.get("X-Codigo-Cancelamento", "")

    if not (eh_comissao(request) or codigo_confere(inscricao, codigo)):
        logger.warning(
            "IDOR bloqueado: cancelamento da inscricao %s sem o codigo certo ip=%s",
            inscricao_id, request.META.get("REMOTE_ADDR", "?"),
        )
        # 404, igual a "nao existe": quem tenta adivinhar IDs nao descobre nada.
        return nao_encontrada

    inscricao.delete()

    return HttpResponse(status=204)