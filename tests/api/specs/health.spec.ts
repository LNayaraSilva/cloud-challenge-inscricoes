import { test, expect } from '../fixtures/api.fixtures';
import { expectSchema, healthSchema } from '../schemas';
import { isManagedServer } from '../../shared/config/env';

test.describe('GET /health', () => {
  test('responde 200 com {"status": "ok"} em JSON', async ({ publicApi }) => {
    const resposta = await publicApi.health.verificar();

    expect(resposta.status()).toBe(200);
    expect(resposta.headers()['content-type']).toContain('application/json');
    expectSchema(healthSchema, await resposta.json());
  });

  test('envia os cabeçalhos de segurança do Django', async ({ publicApi }) => {
    const headers = (await publicApi.health.verificar()).headers();

    expect(headers['x-frame-options']).toBe('DENY');
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['referrer-policy']).toBe('same-origin');
    expect(headers['cross-origin-opener-policy']).toBe('same-origin');
  });

  test('rejeita métodos de escrita', async ({ request }) => {
    const resposta = await request.post('/health', { data: {} });

    // Sem token CSRF o middleware do Django bloqueia antes da view (403);
    // a view, decorada com @require_GET, responderia 405.
    expect([403, 405]).toContain(resposta.status());
    expect(await resposta.text()).not.toContain('"status": "ok"');
  });

  test('não libera CORS para origens não autorizadas', async ({ publicApi }) => {
    const resposta = await publicApi.health.verificar({ Origin: 'https://origem-nao-autorizada.example' });

    expect(resposta.status()).toBe(200);
    expect(resposta.headers()['access-control-allow-origin']).toBeUndefined();
  });

  test('libera CORS para o frontend local configurado por padrão', async ({ publicApi }) => {
    test.skip(!isManagedServer, 'Depende de CORS_ALLOWED_ORIGINS do ambiente externo.');
    const origem = 'http://localhost:5173';

    const resposta = await publicApi.health.verificar({ Origin: origem });

    expect(resposta.headers()['access-control-allow-origin']).toBe(origem);
  });
});
