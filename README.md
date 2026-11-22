# 🎓 Cloud Challenge | Semana Acadêmica

<p align="center">
  <strong>Sistema web para divulgação de eventos e gerenciamento de inscrições acadêmicas</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.10%2B-3776AB?logo=python&logoColor=white" alt="Python">
  <img src="https://img.shields.io/badge/Django-5.2-092E20?logo=django&logoColor=white" alt="Django">
  <img src="https://img.shields.io/badge/JavaScript-Frontend-F7DF1E?logo=javascript&logoColor=black" alt="JavaScript">
  <img src="https://img.shields.io/badge/Azure-App%20Service-0078D4?logo=microsoftazure&logoColor=white" alt="Azure">
</p>

## 📖 Sobre o projeto

O **Cloud Challenge — Semana Acadêmica** é um projeto acadêmico de sistema de inscrições em palestras, oficinas e outras atividades. A proposta reúne uma interface web para participantes, uma API REST em Django e uma estrutura de dados para gerenciar eventos e inscrições.

O repositório contém tanto a implementação da interface quanto o backend, documentos técnicos, esquema de banco de dados e configuração de implantação em nuvem.

> **Estado do código enviado:** o frontend (`frontend/script.js`) ainda trabalha com eventos e inscrições **simulados em memória**. O backend Django possui endpoints próprios. Portanto, a interface demonstrativa não deve ser confundida com uma integração persistente já validada.

## ✨ Funcionalidades

### 🖥️ Interface web (frontend)
- Página inicial com apresentação da Semana Acadêmica;
- Listagem de eventos em cards;
- Busca de eventos pelo título;
- Visualização de data, local e vagas disponíveis;
- Seleção de evento e formulário de inscrição;
- Indicação de eventos encerrados ou sem vagas;
- Seção de participantes inscritos por evento;
- Layout responsivo desenvolvido em HTML, CSS e JavaScript.

**Observação:** as operações de inscrição e consulta de participantes da interface usam dados locais simulados na versão enviada.

### ⚙️ API REST (backend)
- Cadastro e consulta de eventos;
- Consulta de detalhes de um evento;
- Criação e listagem de inscrições;
- Cancelamento de inscrições;
- Validação de dados e regras de negócio;
- Restrição de e-mail duplicado por evento;
- Endpoint de verificação de funcionamento (`/health`).

## 🛠️ Tecnologias

| Camada | Tecnologias |
|---|---|
| Frontend | HTML5, CSS3 e JavaScript |
| Backend | Python e Django 5.2 |
| Banco de dados | SQLite por padrão; PostgreSQL configurável |
| API | HTTP, JSON e arquitetura REST |
| Nuvem | Microsoft Azure App Service |
| Implantação | GitHub Actions e Gunicorn |
| Outras bibliotecas | `psycopg`, `dj-database-url`, `django-cors-headers`, `python-dotenv`, `whitenoise` |

## 🗂️ Estrutura do repositório

```text
cloud-challenge-inscricoes/
├── .github/
│   └── workflows/           # Pipeline de implantação no Azure
├── backend/
│   ├── api/                 # Models, views, serializers, testes e rotas
│   ├── config/              # Configurações do Django
│   ├── .env.example         # Exemplo das variáveis de ambiente
│   ├── manage.py
│   └── requirements.txt
├── banco/
│   └── schema.sql           # Esquema SQL de referência
├── docs/
│   ├── contrato-api.md      # Contrato e exemplos da API
│   └── exemplos/            # JSONs de exemplo
├── documentos/              # Planejamento e registros técnicos da nuvem
├── frontend/
│   ├── index.html           # Estrutura da interface
│   ├── style.css            # Estilização
│   └── script.js            # Comportamentos e simulação de dados
└── README.md
```

## 🚀 Como executar localmente

### Pré-requisitos
- Python 3.10 ou superior;
- Git;
- Navegador atualizado;
- PostgreSQL **opcional** (sem configuração adicional, o Django usa SQLite).

### 1. Clonar o repositório

```bash
git clone https://github.com/LNayaraSilva/cloud-challenge-inscricoes.git
cd cloud-challenge-inscricoes/backend
```

### 2. Criar e ativar um ambiente virtual

**Windows (PowerShell):**

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
```

**Linux/macOS:**

```bash
python3 -m venv .venv
source .venv/bin/activate
```

### 3. Instalar dependências

```bash
pip install -r requirements.txt
```

### 4. Configurar variáveis de ambiente

Crie um arquivo `.env` dentro de `backend/` a partir do modelo `.env.example`.

**Windows:**
```powershell
Copy-Item .env.example .env
```

**Linux/macOS:**
```bash
cp .env.example .env
```

O SQLite será utilizado automaticamente se `DATABASE_URL` não estiver definida. Para usar PostgreSQL, configure:

```env
DATABASE_URL=postgresql://usuario:senha@localhost:5432/inscricoes
```

Para as rotas da comissão (cadastrar evento), defina também o token:

```env
COMISSAO_TOKEN=gere-um-valor-longo-e-aleatorio
```

Para gerar um valor: `python -c "import secrets; print(secrets.token_urlsafe(32))"`. No Azure, cadastre `COMISSAO_TOKEN` em **App Service → Configurações → Variáveis de ambiente**.

> Nunca publique senhas, chaves secretas ou o arquivo `.env` no GitHub.

### 5. Aplicar migrações

```bash
python manage.py migrate
```

### 6. Iniciar o servidor

```bash
python manage.py runserver
```

Acesse:
- **API:** http://127.0.0.1:8000/api/eventos
- **Saúde da aplicação:** http://127.0.0.1:8000/health

### 7. Visualizar o frontend demonstrativo

Abra `frontend/index.html` no navegador (ou utilize uma extensão de servidor local, como Live Server, no VS Code).

A interface pode ser explorada com os dados simulados presentes em `frontend/script.js`. A rota `/` do Django depende dos arquivos do frontend serem preparados para o diretório de templates e arquivos estáticos, conforme a configuração de implantação.

## 🔌 Endpoints da API

| Método | Rota | Finalidade | Acesso |
|---|---|---|---|
| `GET` | `/health` | Verificar o funcionamento da aplicação | Público |
| `GET` | `/api/eventos` | Listar eventos | Público |
| `POST` | `/api/eventos` | Cadastrar evento | Comissão (token) |
| `GET` | `/api/eventos/{id}` | Consultar detalhes | Público |
| `GET` | `/api/eventos/{id}/inscricoes` | Listar participantes inscritos | Público com e-mail mascarado |
| `POST` | `/api/eventos/{id}/inscricoes` | Registrar inscrição | Público |
| `DELETE` | `/api/inscricoes/{id}` | Cancelar inscrição | Código de cancelamento ou comissão |

Exemplo de corpo JSON para inscrição:

```json
{
  "participante": {
    "nome": "Maria Silva",
    "email": "maria@exemplo.com"
  }
}
```

Consulte também o [contrato da API](docs/contrato-api.md). **Atenção:** esse documento é uma proposta inicial e ainda menciona Flask; o backend presente no repositório utiliza **Django**.

## 🔒 Segurança das rotas

- **Token da comissão:** cadastrar evento exige `Authorization: Bearer <token>`. O token vem da variável `COMISSAO_TOKEN`; sem ele a rota responde `401` (ou `503` se o servidor não tiver o token configurado).
- **Proteção contra IDOR:** cada inscrição recebe um `codigo_cancelamento` secreto, devolvido só para quem se inscreveu. Para cancelar é preciso enviar `X-Codigo-Cancelamento`; trocar o ID na URL sem o código devolve `404`.
- **Privacidade:** a lista pública de inscritos mostra o e-mail mascarado (`m***@exemplo.com`).

Detalhes, como testar e limitações: [docs/seguranca.md](docs/seguranca.md).

## ☁️ Implantação no Azure

A documentação do projeto registra a publicação da aplicação no **Microsoft Azure App Service**, com deploy automatizado por **GitHub Actions**.

- [Acessar a aplicação publicada](https://app-inscricoes-academicas01-cycnhmbzd4g4gugu.mexicocentral-01.azurewebsites.net/)
- [Verificar o endpoint `/health`](https://app-inscricoes-academicas01-cycnhmbzd4g4gugu.mexicocentral-01.azurewebsites.net/health)
- [Ler o planejamento de infraestrutura](documentos/planejamento-azure.md)

**Importante:** o relatório de infraestrutura de 05/11/2026 registra publicação da aplicação e resposta do endpoint de saúde, mas **não confirma a conexão com PostgreSQL**. Na ocasião, o ambiente utilizava SQLite. O estado atual do serviço deve ser verificado antes de afirmar que o banco de produção está integrado.

## 👥 Equipe

| Integrante | Área registrada na documentação |
|---|---|
| Anderson Bem | Desenvolvimento / Backend |
| Laís Nayara | Desenvolvimento / Frontend |
| Lucas Mendes | Nuvem |
| Matheus Goes | Qualidade e testes (QA) |
| Wendel Brasiliano | Banco de dados |
| Wendell Barboza | Nuvem |

## 📚 Documentação complementar

- [Contrato da API](docs/contrato-api.md)
- [Segurança das rotas](docs/seguranca.md)
- [Planejamento Azure](documentos/planejamento-azure.md)
- [Decisões técnicas de nuvem](documentos/decisoes-tecnicas-nuvem.md)
- [Checklist de entrega](documentos/checklist-entrega-nuvem.md)

## 🔭 Próximos passos

- Integrar o frontend aos endpoints Django, substituindo os dados simulados;
- Validar a persistência de inscrições no banco PostgreSQL;
- Executar testes completos da aplicação integrada;
- Revisar o contrato da API para refletir a implementação Django.

---

<p align="center">
  <strong>Projeto acadêmico — Faculdade Senac</strong><br>
  Cloud Challenge • Sistema de Inscrições da Semana Acadêmica
</p>
