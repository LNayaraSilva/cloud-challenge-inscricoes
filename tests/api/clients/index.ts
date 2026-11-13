import type { APIRequestContext } from '@playwright/test';
import { AdminClient } from './AdminClient';
import { AuthClient } from './AuthClient';
import { EventosClient } from './EventosClient';
import { HealthClient } from './HealthClient';
import { InscricoesClient } from './InscricoesClient';

/** Agrupa os clientes que compartilham o mesmo contexto (anônimo ou autenticado). */
export class SemanaAcademicaApi {
  readonly health: HealthClient;
  readonly eventos: EventosClient;
  readonly inscricoes: InscricoesClient;
  readonly auth: AuthClient;
  readonly admin: AdminClient;

  constructor(readonly request: APIRequestContext) {
    this.health = new HealthClient(request);
    this.eventos = new EventosClient(request);
    this.inscricoes = new InscricoesClient(request);
    this.auth = new AuthClient(request);
    this.admin = new AdminClient(request);
  }
}

export { AdminClient, AuthClient, EventosClient, HealthClient, InscricoesClient };
