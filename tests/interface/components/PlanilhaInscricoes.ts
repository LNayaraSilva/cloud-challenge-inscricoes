import type { Locator, Page } from '@playwright/test';

/** Tabela "Inscrições realizadas" exibida no fim da página inicial. */
export class PlanilhaInscricoes {
  readonly secao: Locator;
  readonly titulo: Locator;
  readonly tabela: Locator;
  readonly estado: Locator;
  readonly atualizar: Locator;
  readonly linkLogin: Locator;

  constructor(page: Page) {
    // Seção identificada pelo id: o nome acessível está com problema de encoding (ver specs).
    this.secao = page.locator('#planilha-inscricoes');
    this.titulo = this.secao.getByRole('heading', { level: 2 });
    this.tabela = this.secao.getByRole('table');
    this.estado = this.secao.getByRole('status');
    this.atualizar = this.secao.getByRole('button', { name: 'Atualizar lista' });
    this.linkLogin = this.secao.getByRole('link', { name: 'entre como organizador' });
  }

  linhaCom(texto: string): Locator {
    return this.tabela.getByRole('row').filter({ hasText: texto });
  }
}
