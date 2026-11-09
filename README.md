# Cloud-challenge-inscricoes

API REST para inscrições em eventos da Semana Acadêmica, desenvolvida com Django e PostgreSQL e preparada para implantação na nuvem (Azure).

## Tecnologias

- Python 3.10 ou superior
- Django 5.2
- PostgreSQL (com SQLite como alternativa local)
- django-cors-headers, dj-database-url, psycopg e python-dotenv

## Estrutura

```
cloud-challenge-inscricoes/
├── backend/
│   ├── api/              # Models, views, serializers e rotas da API
│   ├── config/           # Configurações do Django (settings, urls, wsgi/asgi)
│   ├── manage.py
│   ├── requirements.txt
│   └── .env.example      # Modelo das variáveis de ambiente
├── frontend/             # Site público, área da organização e testes JavaScript
├── .github/workflows/    # Testes + build + implantação Azure (fork do responsável)
├── docs/                 # Contrato da API e exemplos JSON
└── documentos/           # Planejamento e decisões da infraestrutura Azure
```

## Configuração do ambiente local

### 1. Pré-requisitos

- Python 3.10 ou superior
- PostgreSQL instalado e em execução, com um banco criado para o projeto:

```sql
CREATE DATABASE inscricoes;
```

### 2. Clonar o repositório

```bash
git clone https://github.com/LNayaraSilva/cloud-challenge-inscricoes.git
cd cloud-challenge-inscricoes/backend
```

### 3. Criar e ativar o ambiente virtual

Windows (PowerShell):

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
```

Linux/macOS:

```bash
python3 -m venv .venv
source .venv/bin/activate
```

### 4. Instalar as dependências

```bash
pip install -r requirements.txt
```

### 5. Configurar as variáveis de ambiente

Copie o arquivo de exemplo para criar o `.env` dentro da pasta `backend`:

```bash
# Windows
copy .env.example .env

# Linux/macOS
cp .env.example .env
```

No `.env`, remova o comentário da linha `DATABASE_URL` e preencha com os dados do seu PostgreSQL:

```env
DATABASE_URL=postgresql://USUARIO:SENHA@HOST:5432/NOME_DO_BANCO
```

As demais variáveis já têm valores padrão para desenvolvimento e não precisam ser alteradas no ambiente local.

> O arquivo `.env` está no `.gitignore` e **não deve ser enviado ao repositório**.
> Se a `DATABASE_URL` não for definida, o projeto usa SQLite (`db.sqlite3`) automaticamente.

### Variáveis disponíveis

| Variável | Obrigatória | Padrão | Descrição |
|---|---|---|---|
| `DATABASE_URL` | Sim (para PostgreSQL) | SQLite local | URL de conexão com o banco |
| `DJANGO_SECRET_KEY` | Em produção | Chave de desenvolvimento | Chave secreta do Django |
| `DJANGO_DEBUG` | Não | `True` | Use `False` em produção |
| `DJANGO_ALLOWED_HOSTS` | Em produção | `localhost,127.0.0.1` | Domínios aceitos, separados por vírgula |
| `CORS_ALLOWED_ORIGINS` | Não | Portas 3000 e 5173 do localhost | Origens do frontend liberadas no CORS |

### 6. Aplicar as migrações

```bash
python manage.py migrate
```

Se este comando rodar sem erros, a conexão com o PostgreSQL está funcionando e as tabelas foram criadas.

### 7. Executar a aplicação

```bash
python manage.py runserver
```

### 8. Validar o funcionamento

- `http://127.0.0.1:8000/health` deve responder `{"status": "ok"}` (confirma que a aplicação está no ar).
- `http://127.0.0.1:8000/api/eventos` deve responder uma lista JSON (confirma a leitura no banco).
- `http://127.0.0.1:8000/` apresenta os eventos **reais** disponíveis no banco.
- `http://127.0.0.1:8000/organizacao/` solicita login de organizador para consultar os inscritos.
- `http://127.0.0.1:8000/admin/` permite administrar eventos e inscrições conforme as permissões do usuário.

Para confirmar qual banco está em uso:

```bash
python manage.py shell -c "from django.db import connection; connection.ensure_connection(); print(connection.vendor, connection.settings_dict['NAME'])"
```

A saída esperada é `postgresql` seguido do nome do banco.

## Endpoints

| Método | Endpoint | Descrição |
|---|---|---|
| GET | `/health` | Verifica se a aplicação está respondendo |
| GET / POST | `/api/eventos` | Lista eventos (público) ou cadastra eventos (somente organizador) |
| GET | `/api/eventos/{id}` | Consulta um evento |
| GET / POST | `/api/eventos/{id}/inscricoes` | Lista participantes (restrito) ou recebe inscrição pública |
| DELETE | `/api/inscricoes/{id}` | Cancela inscrição (somente organizador com CSRF) |

Detalhes das requisições e respostas estão em [`docs/contrato-api.md`](docs/contrato-api.md).

## Implantação na nuvem

Ao publicar no Azure, configure as variáveis de ambiente no próprio serviço (por exemplo, nas configurações de variáveis de ambiente do App Service), e não no arquivo `.env`:

- `DATABASE_URL` apontando para o Azure Database for PostgreSQL, com SSL obrigatório:
  `postgresql://USUARIO:SENHA@SERVIDOR.postgres.database.azure.com:5432/NOME_DO_BANCO?sslmode=require`
- `DJANGO_SECRET_KEY` com uma chave nova e segura
- `DJANGO_DEBUG=False`
- `DJANGO_ALLOWED_HOSTS` com o domínio da aplicação
- `CORS_ALLOWED_ORIGINS` com o endereço do frontend publicado


## Frontend integrado e área da organização

O frontend agora usa a **mesma origem do Django**. Não configure a URL do PostgreSQL no JavaScript.

- Página pública `/`: consulta `GET /api/eventos`, permite filtrar eventos e envia
  `POST /api/eventos/{id}/inscricoes` com o participante escolhido. A própria API
  controla duplicatas, vagas e datas. Os cartões mostram as vagas atualizadas.
- Área restrita `/organizacao/`: após login de um **usuário com `is_staff=True`**,
  permite selecionar o evento e consultar os nomes, e-mails, status e horários
  das inscrições. Não publica essas informações no site de visitantes.
- Administração `/admin/`: cadastro/edição de eventos e gestão de inscrições.

Para criar o primeiro administrador **somente no banco autorizado**, no diretório
`backend` e com as variáveis de ambiente corretas configuradas:

```bash
python manage.py createsuperuser
```

Em produção, execute esse comando somente com autorização e em um terminal
seguro. Não coloque a senha de administrador no GitHub, em mensagens ou na URL.

### Executar os testes antes de publicar

```bash
# Na pasta raiz do projeto, após instalar os requisitos Python
python backend/manage.py test api --noinput
node --check frontend/script.js
node --check frontend/organizacao.js
node frontend/testes_frontend.mjs
```

Os testes Django usam o **banco de testes**, não o PostgreSQL em produção;
no workflow há `DATABASE_URL` vazia para utilizar SQLite isolado.

### Implantação no GitHub

O workflow copia `frontend/index.html` e `frontend/organizacao.html` para
`backend/templates`, e os arquivos CSS/JS para `backend/static/frontend`,
depois executa `collectstatic`. Em desenvolvimento local o Django lê diretamente
os arquivos de `frontend`, sem exigir cópia manual.

**Proteção entre repositórios:** a etapa `deploy` executa somente em
`Luc4s22/cloud-challenge-inscricoes`. Se as alterações forem incorporadas ao
repositório da Laís, os testes e o build poderão rodar, mas não ocorrerá deploy
na conta Azure pessoal automaticamente. A equipe deverá escolher e autorizar
as credenciais e o destino de produção antes de habilitar outro deploy.

**Atenção com dados pessoais:** o endpoint `GET /api/eventos/{id}/inscricoes`
e o cancelamento exigem acesso de organizador. A inscrição de participantes
continua pública. Para uma operação aberta a grande público, ficam recomendados
limitação de requisições, validação de e-mail, controles de privacidade e uma
política de retenção de dados (ver `docs/revisao-tecnica.md`).

**Não execute `banco/schema.sql` no PostgreSQL que já está funcionando.**
Ele é um script de referência com comandos `DROP TABLE`, capazes de apagar
todas as inscrições. O schema da aplicação deve ser mantido pelas migrações
Django (`python manage.py migrate`).
