// Inicializa a aplicação Django para os testes Playwright (servidor gerenciado).
//
// 1. Recria um banco SQLite descartável em tests/.e2e (nunca usa o PostgreSQL
//    configurado em backend/.env, pois DATABASE_URL é sobrescrita aqui).
// 2. Aplica as migrações Django.
// 3. Cria/atualiza o organizador de testes (is_staff) com as credenciais
//    recebidas por variável de ambiente (a senha nunca é passada por argumento).
// 4. Inicia o servidor de desenvolvimento na porta informada.
//
// Uso: node tests/shared/scripts/start-server.mjs <porta>

import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const backendDir = path.join(rootDir, 'backend');
const dataDir = path.join(rootDir, 'tests', '.e2e');
const port = process.argv[2] ?? process.env.E2E_PORT ?? '8010';
// Um banco por porta: permite execuções simultâneas (ex.: modo gráfico aberto + test:demo).
const dbFile = path.join(dataDir, `e2e-${port}.sqlite3`);

function resolvePython() {
  if (process.env.PYTHON_BIN) return process.env.PYTHON_BIN;
  const venvPython = process.platform === 'win32'
    ? path.join(backendDir, '.venv', 'Scripts', 'python.exe')
    : path.join(backendDir, '.venv', 'bin', 'python');
  if (existsSync(venvPython)) return venvPython;
  return process.platform === 'win32' ? 'python' : 'python3';
}

const python = resolvePython();

mkdirSync(dataDir, { recursive: true });
for (const sufixo of ['', '-journal', '-wal', '-shm']) {
  rmSync(dbFile + sufixo, { force: true });
}

// transaction_mode=IMMEDIATE faz o SQLite serializar as transações de escrita,
// aproximando o comportamento do lock de linha (select_for_update) do PostgreSQL
// e evitando erros "database is locked" com testes paralelos.
const databaseUrl = `sqlite:///${dbFile.replace(/\\/g, '/')}?transaction_mode=IMMEDIATE&timeout=30`;

const serverEnv = {
  ...process.env,
  DATABASE_URL: databaseUrl,
  DJANGO_DEBUG: 'True',
  DJANGO_ALLOWED_HOSTS: 'localhost,127.0.0.1',
  PYTHONUNBUFFERED: '1',
  PYTHONIOENCODING: 'utf-8',
};

function runManage(args, extraEnv = {}) {
  const result = spawnSync(python, ['manage.py', ...args], {
    cwd: backendDir,
    env: { ...serverEnv, ...extraEnv },
    stdio: 'inherit',
  });
  if (result.error) {
    console.error(`[e2e] Não foi possível executar "${python}". Configure PYTHON_BIN ou crie backend/.venv.`);
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`[e2e] "manage.py ${args[0]}" terminou com código ${result.status}.`);
  }
}

const criarOrganizador = `
import os
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Permission

User = get_user_model()
usuario, _ = User.objects.get_or_create(username=os.environ["E2E_STAFF_USERNAME"])
usuario.is_staff = True
usuario.is_active = True
usuario.set_password(os.environ["E2E_STAFF_PASSWORD"])
usuario.save()
# Permissões mínimas para a limpeza dos dados de teste pelo Django Admin.
usuario.user_permissions.add(*Permission.objects.filter(
    content_type__app_label="api",
    codename__in=["view_evento", "delete_evento", "view_inscricao", "delete_inscricao"],
))
print("[e2e] Organizador de testes pronto:", usuario.username)
`;

const staffUsername = process.env.TEST_STAFF_USERNAME || 'e2e_organizador';
const staffPassword = process.env.TEST_STAFF_PASSWORD;
if (!staffPassword) {
  throw new Error('[e2e] TEST_STAFF_PASSWORD não definida (o playwright.config.ts a gera automaticamente).');
}

runManage(['migrate', '--noinput', '-v', '0']);
runManage(['shell', '-c', criarOrganizador], {
  E2E_STAFF_USERNAME: staffUsername,
  E2E_STAFF_PASSWORD: staffPassword,
});

const server = spawn(python, ['manage.py', 'runserver', `127.0.0.1:${port}`, '--noreload'], {
  cwd: backendDir,
  env: serverEnv,
  stdio: ['ignore', 'inherit', 'pipe'],
});

// O runserver registra cada requisição no stderr. Repassamos apenas o que não
// é log de acesso (erros, tracebacks), para não poluir a saída dos testes.
// Defina E2E_SERVER_LOGS=1 para ver todas as requisições.
const logAcesso = new RegExp(
  '^\\[[^\\]]+\\] "(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS) .*" \\d{3} ' +
    // Avisos do logger django.request para respostas 4xx esperadas nos testes negativos.
    '|^(Bad Request|Forbidden|Not Found|Method Not Allowed|Conflict|Unprocessable Content|Unprocessable Entity)( \\(CSRF[^)]*\\))?: /',
);
let pendente = '';
server.stderr.setEncoding('utf8');
server.stderr.on('data', bloco => {
  const linhas = (pendente + bloco).split(/\r?\n/);
  pendente = linhas.pop() ?? '';
  for (const linha of linhas) {
    if (!linha.trim()) continue;
    if (!process.env.E2E_SERVER_LOGS && logAcesso.test(linha)) continue;
    process.stderr.write(linha + '\n');
  }
});

const stop = () => server.kill();
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
server.on('exit', code => process.exit(code ?? 0));
