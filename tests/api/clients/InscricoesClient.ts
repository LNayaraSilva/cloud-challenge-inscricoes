import type { APIResponse } from '@playwright/test';
import { BaseApiClient, type RequestOptions } from './BaseApiClient';

/** /api/eventos/{id}/inscricoes e /api/inscricoes/{id} */
export class InscricoesClient extends BaseApiClient {
  /** POST público (rota com csrf_exempt). Strings são enviadas sem serialização. */
  inscrever(eventoId: number | string, corpo: unknown): Promise<APIResponse> {
    return this.request.post(`/api/eventos/${eventoId}/inscricoes`, {
      headers: { 'Content-Type': 'application/json' },
      data: this.corpo(corpo),
    });
  }

  /** GET restrito à organização (contém dados pessoais). */
  listar(eventoId: number | string): Promise<APIResponse> {
    return this.request.get(`/api/eventos/${eventoId}/inscricoes`);
  }

  /** DELETE restrito à organização + CSRF. */
  async cancelar(inscricaoId: number | string, options: RequestOptions = {}): Promise<APIResponse> {
    return this.request.delete(`/api/inscricoes/${inscricaoId}`, {
      headers: await this.headersEscrita(options),
    });
  }
}
