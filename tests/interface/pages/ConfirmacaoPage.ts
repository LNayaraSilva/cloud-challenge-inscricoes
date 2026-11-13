import type { Locator, Page } from '@playwright/test';

export const CHAVE_SESSAO_INSCRICAO = 'semana_academica_inscricao_confirmada_v1';

/** Comprovante "/inscricao-confirmada/" (frontend/inscricao-confirmada.html). */
export class ConfirmacaoPage {
  readonly tituloConfirmada: Locator;
  readonly tituloAusente: Locator;
  readonly evento: Locator;
  readonly nome: Locator;
  readonly email: Locator;
  readonly data: Locator;
  readonly local: Locator;
  readonly situacao: Locator;
  readonly numero: Locator;
  readonly voltar: Locator;
  readonly imprimir: Locator;

  constructor(readonly page: Page) {
    this.tituloConfirmada = page.getByRole('heading', { name: 'Inscrição confirmada!' });
    this.tituloAusente = page.getByRole('heading', { name: 'Nenhuma inscrição para exibir' });
    // Os valores do recibo são <strong> sem rótulo acessível associado; usamos os ids do template.
    this.evento = page.locator('#recibo-evento');
    this.nome = page.locator('#recibo-nome');
    this.email = page.locator('#recibo-email');
    this.data = page.locator('#recibo-data');
    this.local = page.locator('#recibo-local');
    this.situacao = page.locator('#recibo-status');
    this.numero = page.locator('#recibo-id');
    this.voltar = page.getByRole('link', { name: 'Voltar aos eventos' });
    this.imprimir = page.getByRole('button', { name: 'Imprimir resumo' });
  }

  async goto(): Promise<void> {
    await this.page.goto('/inscricao-confirmada/');
  }

  /** Simula o resumo gravado pelo script.js no sessionStorage antes de abrir a página. */
  async prepararResumo(resumo: Record<string, unknown>): Promise<void> {
    await this.page.addInitScript(
      ([chave, valor]) => window.sessionStorage.setItem(chave, valor),
      [CHAVE_SESSAO_INSCRICAO, JSON.stringify(resumo)] as const,
    );
  }
}
