import type { APIResponse } from '@playwright/test';
import { BaseApiClient, type RequestOptions } from './BaseApiClient';

/** /api/eventos e /api/eventos/{id} */
export class EventosClient extends BaseApiClient {
  listar(): Promise<APIResponse> {
    return this.request.get('/api/eventos');
  }

  obter(eventoId: number | string): Promise<APIResponse> {
    return this.request.get(`/api/eventos/${eventoId}`);
  }

  /**
   * POST /api/eventos (somente organizador + CSRF).
   * `corpo` aceita qualquer valor para permitir cenários negativos:
   * strings são enviadas sem serialização (ex.: JSON malformado).
   */
  async criar(corpo: unknown, options: RequestOptions = {}): Promise<APIResponse> {
    return this.request.post('/api/eventos', {
      headers: { 'Content-Type': 'application/json', ...(await this.headersEscrita(options)) },
      data: this.corpo(corpo),
    });
  }
}
