import type { Locator, Page } from '@playwright/test';

/** Painel restrito "/organizacao/" (frontend/organizacao.html + organizacao.js). */
export class OrganizacaoPage {
  readonly titulo: Locator;
  readonly pesquisa: Locator;
  readonly filtroEvento: Locator;
  readonly atualizar: Locator;
  readonly resumo: Locator;
  readonly status: Locator;
  readonly tabela: Locator;
  readonly linhasDados: Locator;
  readonly voltar: Locator;

  constructor(readonly page: Page) {
    this.titulo = page.getByRole('heading', { level: 1, name: 'Inscrições por evento' });
    this.pesquisa = page.getByLabel('Pesquisar');
    this.filtroEvento = page.getByLabel('Evento', { exact: true });
    this.atualizar = page.getByRole('button', { name: 'Atualizar' });
    // Parágrafo aria-live sem papel explícito; id usado pelo organizacao.js.
    this.resumo = page.locator('#resumo-organizacao');
    this.status = page.getByRole('status');
    this.tabela = page.getByRole('table');
    this.linhasDados = this.tabela.getByRole('rowgroup').nth(1).getByRole('row');
    this.voltar = page.getByRole('link', { name: 'Voltar aos eventos' });
  }

  async goto(): Promise<void> {
    await this.page.goto('/organizacao/');
  }

  linhaCom(texto: string): Locator {
    return this.linhasDados.filter({ hasText: texto });
  }

  async pesquisar(termo: string): Promise<void> {
    await this.pesquisa.fill(termo);
  }

  async filtrarPorEvento(titulo: string): Promise<void> {
    await this.filtroEvento.selectOption({ label: titulo });
  }
}
