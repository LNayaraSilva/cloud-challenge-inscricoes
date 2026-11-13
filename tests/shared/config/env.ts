import { randomBytes } from 'node:crypto';
import path from 'node:path';
import dotenv from 'dotenv';

/**
 * Configuração centralizada dos testes.
 *
 * Duas formas de execução:
 *  1. Servidor gerenciado (padrão): BASE_URL não é informada. O Playwright
 *     sobe o Django em uma porta dedicada, com um banco SQLite descartável
 *     e um organizador de testes criado na hora.
 *  2. Ambiente externo: BASE_URL aponta para um ambiente já publicado
 *     (homologação, por exemplo). Credenciais de organizador precisam ser
 *     fornecidas por variáveis de ambiente.
 */

export const ROOT_DIR = path.resolve(__dirname, '..', '..', '..');

dotenv.config({ path: path.join(ROOT_DIR, '.env'), quiet: true });

const DEFAULT_PORT = Number(process.env.E2E_PORT ?? 8010);
const externalBaseUrl = process.env.BASE_URL?.trim();

/** true quando o próprio Playwright inicia a aplicação localmente. */
export const isManagedServer = !externalBaseUrl;

const STAFF_USERNAME_DEFAULT = 'e2e_organizador';

if (isManagedServer && !process.env.TEST_STAFF_PASSWORD) {
  // Banco local é recriado a cada execução: geramos uma senha aleatória
  // para o organizador descartável. O processo principal do Playwright
  // define a variável antes de iniciar o servidor e os workers, que a herdam.
  process.env.TEST_STAFF_PASSWORD = randomBytes(18).toString('base64url');
}

function trimSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

export const env = {
  /** Origem da interface (páginas Django). */
  baseUrl: trimSlash(externalBaseUrl || `http://127.0.0.1:${DEFAULT_PORT}`),
  /**
   * Origem da API. As rotas da aplicação são `/health` e `/api/...`
   * na mesma origem do site, por isso o padrão é igual a `baseUrl`.
   */
  apiBaseUrl: trimSlash(process.env.API_BASE_URL?.trim() || externalBaseUrl || `http://127.0.0.1:${DEFAULT_PORT}`),
  port: DEFAULT_PORT,
  staff: {
    username: process.env.TEST_STAFF_USERNAME?.trim() || STAFF_USERNAME_DEFAULT,
    password: process.env.TEST_STAFF_PASSWORD ?? '',
  },
  pythonBin: process.env.PYTHON_BIN?.trim() || undefined,
  /** Modo apresentação: atraso por ação (ms) e pausa ao final de cada teste (ms). */
  slowMo: Number(process.env.PW_SLOW_MO ?? 0) || 0,
  demoPauseMs: Number(process.env.PW_DEMO_PAUSE ?? 0) || 0,
  isCI: Boolean(process.env.CI),
} as const;

/** Indica se há credenciais de organizador disponíveis para os cenários restritos. */
export const hasStaffCredentials = Boolean(env.staff.username && env.staff.password);

export const MISSING_STAFF_MESSAGE =
  'Credenciais de organizador ausentes: defina TEST_STAFF_USERNAME e TEST_STAFF_PASSWORD para executar contra um ambiente externo.';
