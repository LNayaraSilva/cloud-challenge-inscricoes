import { test as base, request as playwrightRequest, type APIRequestContext } from '@playwright/test';
import { SemanaAcademicaApi } from '../clients';
import { TestDataManager } from './test-data-manager';
import { env, hasStaffCredentials, MISSING_STAFF_MESSAGE } from '../../shared/config/env';

type StorageState = Awaited<ReturnType<APIRequestContext['storageState']>>;

type WorkerFixtures = {
  /** Sessão de organizador, autenticada uma única vez por worker. */
  staffStorageState: StorageState | undefined;
};

type TestFixtures = {
  /** Clientes sem autenticação (visitante). */
  publicApi: SemanaAcademicaApi;
  /** Clientes autenticados como organizador (is_staff), em contexto isolado por teste. */
  staffApi: SemanaAcademicaApi;
  /** Criação e limpeza automática de eventos/inscrições. */
  dados: TestDataManager;
};

export const test = base.extend<TestFixtures, WorkerFixtures>({
  staffStorageState: [
    async ({}, use) => {
      if (!hasStaffCredentials) {
        await use(undefined);
        return;
      }
      const contexto = await playwrightRequest.newContext({ baseURL: env.apiBaseUrl });
      await new SemanaAcademicaApi(contexto).auth.loginOrganizador(env.staff.username, env.staff.password);
      const estado = await contexto.storageState();
      await contexto.dispose();
      await use(estado);
    },
    { scope: 'worker' },
  ],

  publicApi: async ({}, use) => {
    const contexto = await playwrightRequest.newContext({ baseURL: env.apiBaseUrl });
    await use(new SemanaAcademicaApi(contexto));
    await contexto.dispose();
  },

  staffApi: async ({ staffStorageState }, use, testInfo) => {
    testInfo.skip(!staffStorageState, MISSING_STAFF_MESSAGE);
    const contexto = await playwrightRequest.newContext({
      baseURL: env.apiBaseUrl,
      storageState: staffStorageState,
    });
    await use(new SemanaAcademicaApi(contexto));
    await contexto.dispose();
  },

  dados: async ({ staffApi, publicApi }, use) => {
    const gerenciador = new TestDataManager(staffApi, publicApi);
    await use(gerenciador);
    await gerenciador.limpar();
  },
});

export { expect } from '@playwright/test';
