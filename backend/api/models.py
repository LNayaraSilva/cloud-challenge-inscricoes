from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models
from django.db.models import F, Q


class Evento(models.Model):
    titulo = models.CharField(max_length=200)
    descricao = models.TextField()
    palestrante = models.CharField(max_length=200)
    local = models.CharField(max_length=200)
    data_inicio = models.DateTimeField()
    data_fim = models.DateTimeField()
    capacidade = models.PositiveIntegerField(
        validators=[MinValueValidator(1)]
    )
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["data_inicio"]
        constraints = [
            models.CheckConstraint(
                condition=Q(capacidade__gt=0),
                name="evento_capacidade_maior_que_zero",
            ),
            models.CheckConstraint(
                condition=Q(data_fim__gt=F("data_inicio")),
                name="evento_data_fim_apos_inicio",
            ),
        ]

    def clean(self):
        erros = {}

        if (
            self.data_inicio
            and self.data_fim
            and self.data_fim <= self.data_inicio
        ):
            erros["data_fim"] = (
                "A data de término deve ser posterior à data de início."
            )

        if self.capacidade is not None and self.capacidade < 1:
            erros["capacidade"] = "A capacidade deve ser maior que zero."

        if erros:
            raise ValidationError(erros)

    def __str__(self):
        return self.titulo


class Inscricao(models.Model):
    class Status(models.TextChoices):
        CONFIRMADA = "confirmada", "Confirmada"

    evento = models.ForeignKey(
        Evento,
        on_delete=models.CASCADE,
        related_name="inscricoes",
    )
    participante_nome = models.CharField(max_length=200)
    participante_email = models.EmailField()
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.CONFIRMADA,
    )
    criada_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["criada_em"]
        constraints = [
            models.UniqueConstraint(
                fields=["evento", "participante_email"],
                name="inscricao_evento_email_unicos",
            ),
        ]

    def save(self, *args, **kwargs):
        self.participante_email = self.participante_email.strip().lower()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.participante_nome} — {self.evento}"