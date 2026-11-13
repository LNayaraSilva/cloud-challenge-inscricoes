import type { APIResponse } from '@playwright/test';
import { BaseApiClient } from './BaseApiClient';

/** GET /health */
export class HealthClient extends BaseApiClient {
  verificar(headers: Record<string, string> = {}): Promise<APIResponse> {
    return this.request.get('/health', { headers });
  }
}
