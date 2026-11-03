from django.utils import timezone

from .models import Inscricao


def data_iso(data):
    if data is None:
        return None

    return timezone.localtime(data).isoformat()


def evento_para_dict(evento):
    total_confirmadas = getattr(
        evento,
        "total_inscricoes_confirmadas",
        None,
    )

    if total_confirmadas is None:
        total_confirmadas = evento.inscricoes.filter(
            status=Inscricao.Status.CONFIRMADA
        ).count()

    return {
        "id": evento.id,
        "titulo": evento.titulo,
        "descricao": evento.descricao,
        "palestrante": evento.palestrante,
        "local": evento.local,
        "data_inicio": data_iso(evento.data_inicio),
        "data_fim": data_iso(evento.data_fim),
        "capacidade": evento.capacidade,
        "vagas_disponiveis": max(
            evento.capacidade - total_confirmadas,
            0,
        ),
    }


def inscricao_para_dict(inscricao):
    return {
        "id": inscricao.id,
        "evento_id": inscricao.evento_id,
        "participante": {
            "nome": inscricao.participante_nome,
            "email": inscricao.participante_email,
        },
        "status": inscricao.status,
        "criada_em": data_iso(inscricao.criada_em),
    }