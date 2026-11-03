from django.contrib import admin

from .models import Evento, Inscricao


@admin.register(Evento)
class EventoAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "titulo",
        "local",
        "data_inicio",
        "capacidade",
    )
    search_fields = (
        "titulo",
        "palestrante",
        "local",
    )
    ordering = ("data_inicio",)


@admin.register(Inscricao)
class InscricaoAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "participante_nome",
        "participante_email",
        "evento",
        "status",
        "criada_em",
    )
    search_fields = (
        "participante_nome",
        "participante_email",
        "evento__titulo",
    )
    list_filter = ("status", "evento")