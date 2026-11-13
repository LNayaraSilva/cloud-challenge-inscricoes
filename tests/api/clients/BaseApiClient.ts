import type { APIRequestContext } from '@playwright/test';
import { env } from '../../shared/config/env';

export interface RequestOptions {
  /**
   * Omite o cabeçalho X-CSRFToken. Usado para provar que o
   * CsrfViewMiddleware protege as operações administrativas.
   */
  semCsrf?: boolean;
}

/**
 * Base dos clientes HTTP. Recebe um APIRequestContext já configurado com
 * `baseURL` (projeto `api`) e, quando autenticado, com o cookie de sessão.
 */
export abstract class BaseApiClient {
  constructor(protected readonly request: APIRequestContext) {}

  /**
   * Strings são enviadas como bytes crus (o Playwright serializaria uma
   * string como JSON), permitindo testar corpos malformados.
   */
  protected corpo(dados: unknown): unknown {
    return typeof dados === 'string' ? Buffer.from(dados, 'utf-8') : dados;
  }

  /** Valor atual do cookie `csrftoken` do contexto, se houver. */
  async csrfToken(): Promise<string | undefined> {
    const { cookies } = await this.request.storageState();
    return cookies.find(cookie => cookie.name === 'csrftoken')?.value;
  }

  /**
   * Cabeçalhos aceitos pelo CsrfViewMiddleware do Django. O Referer é
   * obrigatório em HTTPS (ambientes publicados) e inofensivo em HTTP.
   */
  protected async headersEscrita(options: RequestOptions = {}): Promise<Record<string, string>> {
    const headers: Record<string, string> = { Referer: `${env.apiBaseUrl}/` };
    if (options.semCsrf) return headers;

    const token = await this.csrfToken();
    if (token) headers['X-CSRFToken'] = token;
    return headers;
  }
}
