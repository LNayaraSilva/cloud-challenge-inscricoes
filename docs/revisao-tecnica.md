# Revisão do projeto — integração de frontend, segurança e implantação

Revisão realizada em **09/11/2026** a partir do ZIP fornecido pelo responsável.

## Diagnóstico encontrado no material de entrada

1. `frontend/script.js` apresentava três eventos fictícios e simulava inscrições em memória. Não consultava PostgreSQL pela API.
2. A página pública não mostrava o evento real criado no banco; o endpoint `/api/eventos` já havia sido validado separadamente na Azure.
3. `GET /api/eventos/{id}/inscricoes` expunha nome/e-mail de participantes sem verificar login.
4. `DELETE /api/inscricoes/{id}` permitia remoção pública de inscrições.
5. `POST /api/eventos` permitia criação pública de eventos.
6. `backend/templates` e `backend/static` não existiam no repositório-base; eram criadas apenas durante o build, dificultando a execução local da página.
7. A etapa de deploy apontava para o App Service pessoal do responsável, com risco de execução no repositório de outra pessoa.
8. Os documentos de nuvem ainda indicavam pendência de conexão PostgreSQL e erro 500; posteriormente esses pontos foram verificados e resolvidos pelo responsável nos testes da Azure.

## O que foi implementado

- Site público integrado a `GET /api/eventos`, com tratamento de erro e filtro.
- `POST /api/eventos/{id}/inscricoes` real pelo formulário; vagas atualizadas após o cadastro.
- Página `/organizacao/` protegida por login de colaborador (`is_staff`), com consulta e pesquisa de inscrições por evento.
- Proteção da API para que nomes/e-mails dos inscritos sejam listados apenas à organização.
- Restrição de cadastro de eventos e exclusão de inscrições aos organizadores; ações administrativas usam CSRF.
- Templates Django com `{% static %}` e configuração para desenvolvimento local e coleta de arquivos estáticos no Azure.
- Workflow com testes Django e JavaScript antes do build, e deploy condicionado ao fork de infraestrutura `Luc4s22/cloud-challenge-inscricoes`.
- Testes adicionais de autenticação e proteção de informações pessoais na API.
- README e documentação de contrato atualizados.

## Como conferir após publicar

1. Página `/`: verificar se o evento real aparece (e não os três exemplos estáticos).
2. Fazer uma inscrição com e-mail de teste autorizado; confirmar resposta e redução da quantidade de vagas.
3. Tentar registrar novamente o mesmo e-mail: a API deverá responder `409`.
4. Abrir `/organizacao/` sem login: deve redirecionar para `/admin/login/`.
5. Acessar `/organizacao/` como usuário `is_staff`: consultar o evento e os inscritos.
6. Sem login, chamar `GET /api/eventos/{id}/inscricoes`: deve responder `403`, sem dados pessoais.
7. Conferir em `/admin/` o evento e as inscrições registradas.
8. Revisar logs de execução no GitHub Actions e no App Service, sem expor segredos.
9. **Excluir os dados de teste** depois de validar e com autorização do responsável pelo banco.

## Pendências que dependem da equipe

- Confirmar qual conta da equipe terá permissões de organização; criar usuários/superusuários com cuidado no banco correto.
- Confirmar requisitos de cancelamento para participante: hoje o cancelamento administrativo é restrito, sem fluxo próprio de autoatendimento.
- Adotar limitação de requisições ou proteção anti-spam na inscrição pública e confirmação de e-mail, se for receber inscrições externas.
- Definir aviso de privacidade, retenção de dados e autorização para acesso às listas de participantes.
- Confirmar o domínio/credenciais de implantação oficiais; o novo workflow **não publica na Azure pessoal quando executado no repositório de Laís**.
- Validar com o grupo alterações da API que agora retornam `403` para consulta/cancelamento sem autenticação.

## Limite desta revisão

Foram executadas verificações de sintaxe Python e JavaScript e testes JavaScript com respostas simuladas da API. **Os testes integrados Django e PostgreSQL/Azure não foram executados nesta máquina**, porque o pacote Django e outras dependências não estavam disponíveis no ambiente de revisão. O workflow foi configurado para rodar os testes Django no GitHub Actions antes de publicar. O ZIP não contém credenciais reais.
