"""
Codigo de cancelamento por inscricao (protecao contra IDOR no DELETE).

Em tres passos porque o campo e UNICO: as inscricoes que ja existem precisam
receber um codigo diferente cada uma antes de a restricao ser criada.
"""

import uuid

from django.db import migrations, models


def gerar_codigos(apps, schema_editor):
    Inscricao = apps.get_model("api", "Inscricao")
    for inscricao in Inscricao.objects.filter(codigo_cancelamento__isnull=True):
        inscricao.codigo_cancelamento = uuid.uuid4()
        inscricao.save(update_fields=["codigo_cancelamento"])


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="inscricao",
            name="codigo_cancelamento",
            field=models.UUIDField(null=True, editable=False),
        ),
        migrations.RunPython(gerar_codigos, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="inscricao",
            name="codigo_cancelamento",
            field=models.UUIDField(default=uuid.uuid4, unique=True, editable=False),
        ),
    ]
