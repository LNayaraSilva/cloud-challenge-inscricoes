"""
Seguranca das rotas da API.

Duas regras, simples de explicar:

1. ROTAS DA COMISSAO (cadastrar evento e ver os e-mails dos inscritos)
   so funcionam com o token da comissao no cabecalho:

       Authorization: Bearer <token da comissao>

   O token fica na variavel de ambiente COMISSAO_TOKEN (App Service ->
   Variaveis de ambiente, ou .env local). Nunca no codigo nem no Git.

2. PROTECAO CONTRA IDOR NO CANCELAMENTO
   IDOR = trocar o ID na URL e mexer no que e de outra pessoa
   (DELETE /api/inscricoes/1, /2, /3...). Agora cada inscricao recebe um
   codigo de cancelamento secreto, devolvido SO para quem se inscreveu.
   Para cancelar, e preciso mandar esse codigo:

       X-Codigo-Cancelamento: <codigo recebido na inscricao>

   Sem o codigo certo, a resposta e 404, igual a "nao existe": quem tenta
   adivinhar IDs nao descobre nem se a inscricao existe.
"""

import hmac
import logging

from django.conf import settings
from django.http import JsonResponse

logger = logging.getLogger("api.seguranca")


def _erro(codigo, mensagem, status):
    return JsonResponse({"erro": codigo, "mensagem": mensagem}, status=status)


def _token_enviado(request):
    cabecalho = request.headers.get("Authorization", "")
    if cabecalho.startswith("Bearer "):
        return cabecalho[len("Bearer "):].strip()
    return ""


def eh_comissao(request):
    """True se a requisicao trouxe o token da comissao correto."""
    esperado = settings.COMISSAO_TOKEN
    enviado = _token_enviado(request)
    # compare_digest compara em tempo constante (nao vaza o token pelo tempo de resposta).
    return bool(esperado and enviado and hmac.compare_digest(enviado.encode(), esperado.encode()))


def verificar_comissao(request):
    """
    Devolve None se a requisicao e da comissao; senao, a resposta de erro pronta.
    Sem token configurado no servidor -> 503 (falha FECHADA: ninguem passa).
    Sem token ou token errado -> 401.
    """
    if not settings.COMISSAO_TOKEN:
        logger.error("COMISSAO_TOKEN nao configurado: rota da comissao bloqueada.")
        return _erro(
            "SERVICO_INDISPONIVEL",
            "Esta operação está indisponível no momento.",
            503,
        )
    if not eh_comissao(request):
        logger.warning(
            "Acesso negado a rota da comissao: %s %s ip=%s",
            request.method, request.path, request.META.get("REMOTE_ADDR", "?"),
        )
        return _erro(
            "NAO_AUTORIZADO",
            "Esta operação é exclusiva da comissão organizadora.",
            401,
        )
    return None


def codigo_confere(inscricao, codigo_enviado):
    """O codigo de cancelamento enviado e o desta inscricao?"""
    return bool(codigo_enviado) and hmac.compare_digest(
        str(inscricao.codigo_cancelamento).encode(), codigo_enviado.strip().encode()
    )


def mascarar_email(email):
    """maria.silva@exemplo.com -> m***@exemplo.com (lista publica de inscritos)."""
    usuario, _, dominio = email.partition("@")
    return f"{usuario[:1]}***@{dominio}" if dominio else "***"
