# Automação de testes — Playwright (API e Interface)

Testes automatizados da aplicação de inscrições da Semana Acadêmica (Django +
HTML/JS), escritos em **TypeScript** com **Playwright Test**.

- **API** (`tests/api`): endpoints JSON, contratos, regras de negócio,
  autorização e CSRF, usando `APIRequestContext`.
- **Interface** (`tests/interface`): jornadas do visitante e do organizador no
  navegador (Chromium), com Page Object Model.

Os testes Django (`backend/api/tests.py`) continuam existindo e testam a
aplicação por dentro. Esta suíte testa de fora, pela rede, com o servidor real
em execução.

---

## 1. Arquitetura

```
Playwright (npm test)
 ├─ webServer ──> tests/shared/scripts/start-server.mjs
 │                 ├─ recria o banco SQLite descartável (tests/.e2e/e2e-<porta>.sqlite3)
 │                 ├─ python manage.py migrate
 │                 ├─ cria o organizador de teste (is_staff) com senha aleatória
 │                 └─ python manage.py runserver 127.0.0.1:8010
 ├─ projeto "api"       → tests/api/specs/**        (sem navegador)
 └─ projeto "interface" → tests/interface/specs/**  (Chromium)
```

- **Servidor gerenciado (padrão).** Sem `BASE_URL`, o Playwright sobe o Django
  numa porta própria (8010) com um banco novo a cada execução. O PostgreSQL de
  `backend/.env` **nunca** é usado: `DATABASE_URL` é sobrescrita pelo script.
- **Ambiente externo.** Com `BASE_URL` preenchida, nenhum servidor é iniciado e
  os testes rodam contra a URL informada (ver seção 5).
- **Autenticação.** Organizadores entram pelo login do Django Admin
  (`/admin/login/`, sessão + CSRF). A fixture `staffStorageState` faz esse login
  **uma vez por worker** via API e reaproveita os cookies nos testes de API e de
  Interface.
- **Massa de dados.** Cada teste cria seus próprios eventos/inscrições pela API
  (fixture `dados`), com nomes e e-mails únicos (`example.com`). Ao final, os
  eventos são excluídos pelo Django Admin (a exclusão remove também as
  inscrições, por cascata). Assim os testes são independentes e podem rodar em
  paralelo e em qualquer ordem.

## 2. Estrutura de diretórios

```
playwright.config.ts          # projetos api/interface, reporters, webServer
tsconfig.json
.env.example                  # variáveis da automação (copiar para .env)
tests/
├── api/
│   ├── specs/                # cenários por funcionalidade
│   │   ├── health.spec.ts
│   │   ├── eventos-consulta.spec.ts       GET /api/eventos, GET /api/eventos/{id}
│   │   ├── eventos-cadastro.spec.ts       POST /api/eventos
│   │   ├── inscricoes-cadastro.spec.ts    POST /api/eventos/{id}/inscricoes
│   │   ├── inscricoes-consulta.spec.ts    GET  /api/eventos/{id}/inscricoes
│   │   └── inscricoes-cancelamento.spec.ts DELETE /api/inscricoes/{id}
│   ├── clients/              # clientes HTTP reutilizáveis (um por recurso)
│   │   ├── BaseApiClient.ts  # CSRF (X-CSRFToken + Referer) e corpo cru
│   │   ├── EventosClient.ts, InscricoesClient.ts, HealthClient.ts
│   │   ├── AuthClient.ts     # login de organizador pelo /admin/login/
│   │   ├── AdminClient.ts    # exclusão de eventos de teste (limpeza)
│   │   └── index.ts          # SemanaAcademicaApi: agrupa os clientes
│   ├── fixtures/
│   │   ├── api.fixtures.ts   # publicApi, staffApi, dados, staffStorageState
│   │   └── test-data-manager.ts
│   ├── data/
│   │   ├── factories.ts      # buildEvento, buildEventoIniciado, buildParticipante
│   │   └── payloads-invalidos.ts
│   └── schemas/index.ts      # contratos (zod) + expectSchema()
├── interface/
│   ├── specs/                # home, eventos, inscricao, confirmacao, organizacao, planilha-home
│   ├── pages/                # HomePage, ConfirmacaoPage, OrganizacaoPage, AdminLoginPage
│   ├── components/           # EventoCard, InscricaoForm, PlanilhaInscricoes
│   ├── fixtures/ui.fixtures.ts  # Page Objects + opção "autenticado"
│   └── data/mensagens.ts     # textos esperados na interface
└── shared/
    ├── config/env.ts         # leitura centralizada das variáveis
    ├── types/api.ts          # tipos de Evento, Inscricao, ErroApi
    ├── utils/data.ts         # sufixo único, datas relativas
    └── scripts/start-server.mjs
```

Gerados na execução (todos no `.gitignore`): `test-results/` (screenshots,
vídeos e traces de falhas), `test-reports/html/`, `test-reports/junit/` e
`tests/.e2e/` (banco descartável).

## 3. Pré-requisitos

- **Node.js 20+** (validado com Node 24).
- **Python 3.10+** com as dependências do backend instaladas. O script procura
  primeiro `backend/.venv`; se não existir, usa `python` do PATH (ou a variável
  `PYTHON_BIN`).
- Não é necessário PostgreSQL para a execução local.

## 4. Instalação

Na raiz do repositório:

```bash
# Backend (uma vez)
python -m venv backend/.venv
# Windows: backend\.venv\Scripts\python -m pip install -r backend/requirements.txt
# Linux/macOS:
backend/.venv/bin/python -m pip install -r backend/requirements.txt

# Automação
npm install
npx playwright install chromium
```

## 5. Variáveis de ambiente

Copie `.env.example` para `.env` na raiz (o arquivo `.env` é ignorado pelo git).
Para a execução local **nada precisa ser preenchido**.

| Variável | Padrão | Uso |
|---|---|---|
| `E2E_PORT` | `8010` | Porta do servidor gerenciado |
| `PYTHON_BIN` | `backend/.venv` ou `python` | Python com as dependências do backend |
| `BASE_URL` | vazio | Se preenchida, roda contra esse ambiente e **não** sobe servidor |
| `API_BASE_URL` | igual a `BASE_URL` | Origem da API, se for diferente do site |
| `TEST_STAFF_USERNAME` | `e2e_organizador` | Organizador usado nos cenários restritos |
| `TEST_STAFF_PASSWORD` | aleatória (local) | Obrigatória em ambiente externo |
| `PW_WORKERS` / `PW_RETRIES` | auto / 0 (2 no CI) | Ajustes de execução |
| `PW_DISABLE_COOP` | `1` | `0` desliga o contorno descrito na seção 12 |
| `E2E_SERVER_LOGS` | vazio | `1` mostra o log de acesso do runserver |
| `PW_SLOW_MO` / `PW_DEMO_PAUSE` | 0 / 0 (700 / 2500 no `test:demo`) | Câmera lenta e pausa final (modo apresentação) |

**Ambiente externo (homologação):** a conta precisa de `is_staff=True` e das
permissões `delete_evento` e `delete_inscricao` (usadas na limpeza). Os testes
**criam e removem eventos e inscrições** — não aponte `BASE_URL` para produção.
Sem credenciais, os cenários que exigem organizador são marcados como
*skipped* com a mensagem explicando o motivo.

## 6. Executar somente os testes de API

```bash
npm run test:api
```

## 7. Executar somente os testes de Interface

```bash
npm run test:ui          # headless
npm run test:headed      # com o navegador visível
npm run test:debug       # Playwright Inspector
npm run test:gui         # interface gráfica do Playwright (UI Mode)
```

### Modo apresentação

Para demonstrar os testes ao vivo (ex.: projetor):

```bash
npm run test:demo
```

Abre o Chromium visível e roda **um teste por vez, em câmera lenta**, com uma
faixa na parte de baixo da tela mostrando o nome do cenário e uma pausa ao
final de cada um. Por padrão roda o roteiro marcado com a tag `@apresentacao`
(9 cenários, ~1,5 min): vitrine e busca, validação de e-mail, jornada completa
de inscrição com comprovante, inscrição duplicada, login/logout do organizador
e filtro do painel.

```bash
npm run test:demo -- tests/interface/specs/inscricao.spec.ts   # outro arquivo
npm run test:demo -- -g "comprovante"                          # filtrar por nome
```

Velocidade: `PW_SLOW_MO` (ms por ação, padrão 700) e `PW_DEMO_PAUSE` (ms no
fim de cada teste, padrão 2500). No PowerShell: `$env:PW_SLOW_MO=1200; npm run test:demo`.
Para incluir um cenário no roteiro, adicione `{ tag: '@apresentacao' }` ao teste.
O modo apresentação não altera os relatórios HTML/JUnit da suíte.

### Vídeos da apresentação técnica

```bash
npm run videos:apresentacao
```

Regrava os vídeos usados em `docs/apresentacao-tecnica.html`, salvos em
`docs/videos/`:

- `ui-mode-api.webm`: interface gráfica do Playwright (UI Mode) rodando os
  testes de API e abrindo os detalhes de alguns cenários.
- `ui-mode-interface.webm`: UI Mode rodando o roteiro `@apresentacao` e
  percorrendo os passos com o snapshot da tela real.
- `interface-*.webm`: o navegador executando cada jornada na aplicação real,
  em câmera lenta.

O script sobe instâncias próprias do Django e do UI Mode (portas 8013, 8014 e
8091) e **falha se algum teste ficar vermelho**, para não gerar vídeo com erro.
Para regravar só uma parte: `VIDEOS=ui-api`, `VIDEOS=ui-interface` ou
`VIDEOS=navegador` (separados por vírgula). Abra a apresentação pelo arquivo
local (duplo clique): os vídeos usam caminhos relativos.

## 8. Executar todos os testes

```bash
npm test
npm run typecheck        # verificação de tipos TypeScript
```

Filtros úteis: `npx playwright test tests/api/specs/health.spec.ts`,
`npx playwright test -g "duplicada"`, `npx playwright test --repeat-each=3`.

## 9. Relatórios

| Relatório | Local | Uso |
|---|---|---|
| HTML | `test-reports/html/index.html` | `npm run test:report` |
| JUnit | `test-reports/junit/results.xml` | publicação no CI/CD |
| Evidências | `test-results/` | screenshot e vídeo em falhas; trace na 1ª repetição |

Para abrir um trace: `npx playwright show-trace test-results/<pasta>/trace.zip`.

> Não sobrescreva `--reporter` na linha de comando se quiser os arquivos HTML e
> JUnit: a opção substitui os reporters configurados.

## 10. Como adicionar novos testes

1. Escolha o projeto: regra/contrato de endpoint → `tests/api/specs`; comportamento
   visível ao usuário → `tests/interface/specs`.
2. Importe `test`/`expect` das fixtures, não de `@playwright/test`:
   - API: `import { test, expect } from '../fixtures/api.fixtures';`
   - Interface: `import { test, expect } from '../fixtures/ui.fixtures';`
3. Crie os dados que o cenário precisa com a fixture `dados`
   (`criarEvento`, `inscrever`, `criarEventoLotado`). Não dependa de dados de
   outros testes nem de dados pré-existentes no banco.
4. Valide comportamento, não só status: corpo (`expectSchema`), mensagem de
   erro, efeito colateral (ex.: vagas recalculadas, registro não criado).
5. Sincronize com *web-first assertions* (`await expect(locator).toHaveText(...)`).
   Não use `waitForTimeout`.
6. Para estados difíceis de produzir (carregamento, erro 500, lista vazia),
   use `page.route` e documente no teste que a resposta é simulada.
7. Interface autenticada: `test.use({ autenticado: true })` no `describe`.

Exemplo:

```ts
import { test, expect } from '../fixtures/api.fixtures';
import { buildParticipante } from '../data/factories';

test('rejeita inscrição duplicada', async ({ publicApi, dados }) => {
  const evento = await dados.criarEvento();
  const participante = buildParticipante();
  await dados.inscrever(evento.id, participante);

  const resposta = await publicApi.inscricoes.inscrever(evento.id, { participante });

  expect(resposta.status()).toBe(409);
  expect((await resposta.json()).erro).toBe('INSCRICAO_DUPLICADA');
});
```

## 11. Page Objects e clientes de API

**Page Objects** (`tests/interface/pages`) e **componentes**
(`tests/interface/components`):

- Expõem *locators* como propriedades `readonly` e ações de usuário como
  métodos (`selecionarEvento`, `preencherEEnviar`, `filtrarPorEvento`).
- Não fazem asserções: as verificações ficam nos specs.
- Prioridade de seletores: `getByRole` → `getByLabel` → `getByPlaceholder` →
  `getByTestId`. Onde o HTML não oferece papel ou rótulo acessível (ex.:
  `#lista-eventos`, valores do comprovante), usamos o `id` já existente no
  template, que é o mesmo usado pelo JavaScript da aplicação — nenhum
  `data-testid` precisou ser adicionado.
- Um componente usado em mais de uma página (ou com escopo próprio, como um
  cartão de evento) vira classe em `components/` e recebe um `Locator` raiz.

**Clientes de API** (`tests/api/clients`):

- Um cliente por recurso, estendendo `BaseApiClient`, retornando o
  `APIResponse` cru — quem decide o que validar é o teste.
- Operações protegidas por CSRF usam `headersEscrita()`; passe
  `{ semCsrf: true }` para testar a proteção.
- Corpos `string` são enviados como bytes crus, para testar JSON malformado.
- Novos endpoints: crie o cliente, registre em `SemanaAcademicaApi`
  (`clients/index.ts`), adicione o schema em `schemas/index.ts` e o tipo em
  `shared/types/api.ts`.

## 12. Dependências externas, limitações e achados

**Defeitos da aplicação encontrados (marcados com `test.fail`).** Os testes
documentam o comportamento correto e falham "como esperado" enquanto o defeito
existir; quando for corrigido, o Playwright acusará *"expected to fail, but
passed"* — remova então o `test.fail`.

1. `GET /api/eventos` não é ordenado por `data_inicio`
   (`eventos-consulta.spec.ts`). O model define `Meta.ordering`, mas a view usa
   `.annotate(Count(...))` e o Django descarta `Meta.ordering` em consultas com
   `GROUP BY` — o SQL não tem `ORDER BY`. Correção sugerida: `.order_by("data_inicio")`
   na view. Impacto: a home lista eventos fora da ordem cronológica.
2. Textos com dupla codificação UTF-8 na tabela de inscrições da home
   (`planilha-home.spec.ts`): o título aparece como `InscriÃ§Ãµes realizadas`.
   Afeta `frontend/index.html` e o bloco `INSCRICOES_NA_HOME_V1` de
   `frontend/script.js`.

**Outros pontos observados**

- `frontend/testes_frontend.mjs` (teste existente, fora desta suíte) já falhava
  antes desta automação: o mock de `testarListaPrivada` não cria o elemento
  `filtrar-evento` usado por `organizacao.js`. O passo "Verificar JavaScript" do
  workflow do GitHub Actions falhará por isso.
- Sem nenhum evento cadastrado, a tabela da home mostra "0 inscrições
  registradas" ao visitante, sem o aviso de acesso restrito, porque o script só
  consulta a rota protegida por evento. Não há vazamento de dados.
- As tabelas de inscritos (home e `/organizacao/`) consultam as inscrições de
  todos os eventos com `Promise.all`: se um único evento for excluído entre a
  listagem e a consulta (HTTP 404), a tabela inteira mostra erro. Os testes
  dessas telas usam `exibirSomenteEventos` (`interface/fixtures/rede.ts`) para
  não sofrer com a limpeza feita por testes paralelos; a resposta continua
  vindo da API real. Sugestão para a aplicação: `Promise.allSettled` ou
  ignorar eventos que retornem 404.
- `POST /health` e outros métodos de escrita sem CSRF retornam **403** (bloqueio
  do `CsrfViewMiddleware`) antes de chegar ao 405 da view; os testes Django,
  que não aplicam CSRF, veem 405.

**Limitações**

- **Depende da integração do front-end com a API.** A automação foi escrita
  contra a versão integrada do fork `Luc4s22/cloud-challenge-inscricoes`
  (páginas `/organizacao/` e `/inscricao-confirmada/`, tabela de inscritos,
  permissões de organizador e templates lidos de `frontend/`). Na `main` deste
  repositório, em 19/11/2026, esses commits ainda não existiam: 81 de 88 testes
  de API passavam (os 7 restantes são de permissão) e só 2 de 43 de interface,
  porque `/` responde 500 (`TemplateDoesNotExist: index.html`) ao rodar
  localmente. Os testes passam integralmente depois que esse trabalho for
  integrado à `main`.
- **Usuário autenticado sem `is_staff`:** o único login disponível é o do Django
  Admin, que recusa contas sem `is_staff`. O cenário "usuário comum recebe 403"
  continua coberto apenas pelos testes Django (`force_login`).
- **Banco local:** o servidor gerenciado usa SQLite com
  `transaction_mode=IMMEDIATE` (via `DATABASE_URL`) para serializar escritas
  concorrentes, aproximando o lock de linha (`select_for_update`) do
  PostgreSQL de produção. O teste de disputa pela última vaga deve ser
  reexecutado contra um ambiente PostgreSQL (homologação) para validação final.
- **Contorno de COOP no Chromium:** o Django envia
  `Cross-Origin-Opener-Policy: same-origin`, o que faz o Chromium criar um
  processo novo a cada navegação inicial. Em estações com antivírus/EDR
  corporativo isso custou ~3 s por página e causava timeouts. O projeto
  `interface` inicia o Chromium com `--disable-features=CrossOriginOpenerPolicy`;
  a aplicação não usa `window.open`/`window.opener` (único comportamento
  afetado), e a presença do cabeçalho segue validada em `health.spec.ts`. Use
  `PW_DISABLE_COOP=0` para desligar o contorno.
- Somente Chromium está configurado. Firefox/WebKit podem ser adicionados como
  novos projetos em `playwright.config.ts`.
- Os testes não foram executados contra o ambiente Azure publicado, pois
  dependem de credenciais de organizador e de autorização para criar dados lá.
