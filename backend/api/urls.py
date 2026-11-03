from django.urls import path

from .views import (
    cancelar_inscricao,
    detalhe_evento,
    eventos,
    health,
    inscricoes_evento,
)


urlpatterns = [
    path("health", health, name="health"),
    path("api/eventos", eventos, name="eventos"),
    path(
        "api/eventos/<int:evento_id>",
        detalhe_evento,
        name="detalhe_evento",
    ),
    path(
        "api/eventos/<int:evento_id>/inscricoes",
        inscricoes_evento,
        name="inscricoes_evento",
    ),
    path(
        "api/inscricoes/<int:inscricao_id>",
        cancelar_inscricao,
        name="cancelar_inscricao",
    ),
]