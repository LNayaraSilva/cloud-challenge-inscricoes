import { defineConfig, devices } from '@playwright/test';
import { env, isManagedServer } from './tests/shared/config/env';

/**
 * O Django envia "Cross-Origin-Opener-Policy: same-origin" (SecurityMiddleware).
 * No Chromium isso força a criação de um novo processo de renderização a cada
 * navegação inicial; em estações com antivírus/EDR corporativo esse custo chega
 * a ~3s por página e causa timeouts em execução paralela. A aplicação não usa
 * window.open/window.opener (único comportamento afetado pelo COOP), então
 * desabilitar a feature no navegador de teste não altera os fluxos validados.
 * A presença do cabeçalho continua coberta em tests/api/specs/health.spec.ts.
 * Use PW_DISABLE_COOP=0 para manter o comportamento padrão do navegador.
 */
const chromiumArgs = process.env.PW_DISABLE_COOP === '0' ? [] : ['--disable-features=CrossOriginOpenerPolicy'];

/**
 * Modo apresentação (npm run test:demo): PW_SLOW_MO atrasa cada ação do
 * navegador em milissegundos. Os tempos limite crescem na mesma proporção.
 */
const slowMo = env.slowMo;
const modoApresentacao = slowMo > 0;

const retries = process.env.PW_RETRIES !== undefined
  ? Number(process.env.PW_RETRIES)
  : env.isCI ? 2 : 0;

export default defineConfig({
  testDir: './tests',
  outputDir: './test-results',
  fullyParallel: true,
  forbidOnly: env.isCI,
  retries,
  workers: process.env.PW_WORKERS ? Number(process.env.PW_WORKERS) : env.isCI ? 2 : undefined,
  timeout: modoApresentacao ? 300_000 : 30_000,
  expect: { timeout: modoApresentacao ? 15_000 : 5_000 },

  reporter: [
    ['list'],
    ['html', { outputFolder: 'test-reports/html', open: 'never' }],
    ['junit', { outputFile: 'test-reports/junit/results.xml' }],
  ],

  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    // PW_VIDEO=on grava todos os testes em 1280x720 (usado na gravação dos vídeos da apresentação).
    video: process.env.PW_VIDEO === 'on' ? { mode: 'on', size: { width: 1280, height: 720 } } : 'retain-on-failure',
    actionTimeout: modoApresentacao ? 30_000 + slowMo : 10_000,
    navigationTimeout: modoApresentacao ? 30_000 + slowMo : 15_000,
  },

  projects: [
    {
      name: 'api',
      testDir: './tests/api/specs',
      use: {
        baseURL: env.apiBaseUrl,
        extraHTTPHeaders: { Accept: 'application/json' },
      },
    },
    {
      name: 'interface',
      testDir: './tests/interface/specs',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: env.baseUrl,
        locale: 'pt-BR',
        timezoneId: 'America/Sao_Paulo',
        launchOptions: { args: chromiumArgs, slowMo },
      },
    },
  ],

  // Sobe o Django apenas quando BASE_URL não aponta para um ambiente externo.
  webServer: isManagedServer
    ? {
        command: `node tests/shared/scripts/start-server.mjs ${env.port}`,
        url: `${env.baseUrl}/health`,
        // Sempre um servidor novo: garante banco limpo e credenciais conhecidas.
        reuseExistingServer: false,
        timeout: 120_000,
        stdout: 'ignore',
        stderr: 'pipe',
        env: {
          TEST_STAFF_USERNAME: env.staff.username,
          TEST_STAFF_PASSWORD: env.staff.password,
          ...(env.pythonBin ? { PYTHON_BIN: env.pythonBin } : {}),
        },
      }
    : undefined,
});
