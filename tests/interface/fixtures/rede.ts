import type { Page } from '@playwright/test';
import type { Evento } from '../../shared/types/api';

/**
 * Faz a página enxergar apenas os eventos do próprio teste em GET /api/eventos.
 *
 * As telas de inscritos (home e /organizacao/) consultam as inscrições de
 * TODOS os eventos com Promise.all: se outro teste em paralelo apagar um evento
 * entre a listagem e a consulta, a resposta 404 derruba a tabela inteira.
 * A resposta continua vindo da API real; só é filtrada pelos ids informados.
 */
export async function exibirSomenteEventos(page: Page, ids: number[]): Promise<void> {
  await page.route('**/api/eventos', async route => {
    if (route.request().method() !== 'GET') {
      await route.continue();
      return;
    }
    const resposta = await route.fetch();
    const eventos = (await resposta.json()) as Evento[];
    await route.fulfill({ response: resposta, json: eventos.filter(evento => ids.includes(evento.id)) });
  });
}
