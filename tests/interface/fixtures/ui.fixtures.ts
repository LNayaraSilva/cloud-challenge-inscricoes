import { test as apiTest } from '../../api/fixtures/api.fixtures';
import { AdminLoginPage } from '../pages/AdminLoginPage';
import { ConfirmacaoPage } from '../pages/ConfirmacaoPage';
import { HomePage } from '../pages/HomePage';
import { OrganizacaoPage } from '../pages/OrganizacaoPage';
import { env, MISSING_STAFF_MESSAGE } from '../../shared/config/env';

type UiOptions = {
  /** Quando true, o navegador inicia com a sessão do organizador (test.use({ autenticado: true })). */
  autenticado: boolean;
};

type UiFixtures = {
  /** Automática: só age no modo apresentação (npm run test:demo). */
  apresentacao: void;
  home: HomePage;
  confirmacao: ConfirmacaoPage;
  organizacao: OrganizacaoPage;
  adminLogin: AdminLoginPage;
};

/**
 * Estende as fixtures de API (publicApi, staffApi, dados) com os Page Objects.
 * A sessão de organizador é reaproveitada da autenticação via API do worker,
 * evitando repetir o login pela interface em cada teste.
 */
export const test = apiTest.extend<UiFixtures & UiOptions>({
  autenticado: [false, { option: true }],

  storageState: async ({ autenticado, staffStorageState, storageState }, use, testInfo) => {
    if (!autenticado) {
      await use(storageState);
      return;
    }
    testInfo.skip(!staffStorageState, MISSING_STAFF_MESSAGE);
    await use(staffStorageState);
  },

  apresentacao: [
    async ({ page }, use, testInfo) => {
      if (!env.slowMo) {
        await use();
        return;
      }
      // Faixa com o nome do cenário. Fica num shadow DOM fechado e ignora o
      // mouse, então não é encontrada pelos locators nem bloqueia cliques.
      await page.addInitScript((titulo: string) => {
        const montar = () => {
          if (document.getElementById('__pw-apresentacao')) return;
          const host = document.createElement('div');
          host.id = '__pw-apresentacao';
          host.setAttribute('aria-hidden', 'true');
          host.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:2147483647;pointer-events:none';
          const faixa = document.createElement('div');
          faixa.textContent = `▶ ${titulo}`;
          faixa.style.cssText =
            'margin:12px auto;width:fit-content;max-width:90%;padding:10px 18px;border-radius:10px;' +
            'background:rgba(20,40,30,.88);color:#fff;font:600 18px/1.3 Arial,sans-serif;' +
            'box-shadow:0 6px 18px rgba(0,0,0,.3)';
          host.attachShadow({ mode: 'closed' }).appendChild(faixa);
          document.documentElement.appendChild(host);
        };
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', montar);
        else montar();
      }, testInfo.title);

      await use();

      // Pausa intencional para a plateia ver o estado final (não é sincronização).
      if (env.demoPauseMs && !page.isClosed()) await page.waitForTimeout(env.demoPauseMs);
    },
    { auto: true },
  ],

  home: async ({ page }, use) => use(new HomePage(page)),
  confirmacao: async ({ page }, use) => use(new ConfirmacaoPage(page)),
  organizacao: async ({ page }, use) => use(new OrganizacaoPage(page)),
  adminLogin: async ({ page }, use) => use(new AdminLoginPage(page)),
});

export { expect } from '@playwright/test';
