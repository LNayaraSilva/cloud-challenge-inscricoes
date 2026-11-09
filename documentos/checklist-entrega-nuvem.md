# Checklist para a entrega — responsabilidade NUVEM

- [x] Acesso ao Azure for Students confirmado.
- [x] Criado o Resource Group `rg-inscricoes-2026`.
- [x] Criado o App Service Linux `app-inscricoes-academicas01` no plano `asp-inscricoes-2026-mx` (Free F1), região Mexico Central.
- [x] Runtime Python 3.13 e startup Gunicorn configurados.
- [x] GitHub Actions configurado para o repositório `Luc4s22/cloud-challenge-inscricoes`.
- [x] Builds e deploys de backend e frontend executados com sucesso.
- [x] Teste `/health` com retorno `{"status":"ok"}` informado.
- [x] Interface original restaurada; execução #5 concluída.
- [x] Requisitos de conexão PostgreSQL identificados neste pacote.
- [x] Configurações de implantação e decisões técnicas documentadas neste pacote.
- [x] Documentos de infraestrutura enviados à branch de trabalho e Pull Request #13 aberta (conforme captura do GitHub).
- [x] Conexão PostgreSQL validada pelo Django com `CONEXAO OK: 1` (teste realizado pelo responsável em 09/11/2026).
- [x] Migrações Django exibidas como aplicadas no PostgreSQL (verificado no terminal da Azure).
- [x] Endpoint `GET /api/eventos` retornando evento salvo no PostgreSQL.
- [ ] Validar **inscrição real** após publicar a nova versão do frontend e conferir a área restrita de inscritos.
- [ ] Confirmar no GitHub Actions a publicação dos novos arquivos e testar a tela em produção.

## Referências de evidência

- Repositório: https://github.com/Luc4s22/cloud-challenge-inscricoes
- Aplicação: https://app-inscricoes-academicas01-cycnhmbzd4g4gugu.mexicocentral-01.azurewebsites.net/
- Saúde: https://app-inscricoes-academicas01-cycnhmbzd4g4gugu.mexicocentral-01.azurewebsites.net/health
- Workflow: `.github/workflows/main_app-inscricoes-academicas01.yml`

## Cuidados

- Não inserir `DATABASE_URL` real, senha ou `DJANGO_SECRET_KEY` em arquivos versionados.
- Não confundir pipeline verde ou página `/health` com banco operacional.
- Não trocar Free F1 por um plano pago sem aprovação e avaliação de custo.
