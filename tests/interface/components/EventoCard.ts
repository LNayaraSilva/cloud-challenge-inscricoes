import type { Locator, Page } from '@playwright/test';

/** Cartão de evento (<article class="card-evento">) gerado por frontend/script.js. */
export class EventoCard {
  readonly titulo: Locator;
  readonly botao: Locator;
  readonly vagas: Locator;
  readonly inicio: Locator;
  readonly termino: Locator;

  constructor(readonly root: Locator) {
    this.titulo = root.getByRole('heading', { level: 3 });
    this.botao = root.getByRole('button');
    this.vagas = root.getByText(/^Vagas disponíveis:/);
    this.inicio = root.getByText(/^Início:/);
    this.termino = root.getByText(/^Término:/);
  }

  /** Localiza o cartão pelo título exato do evento. */
  static porTitulo(page: Page, titulo: string): EventoCard {
    return new EventoCard(
      page.getByRole('article').filter({ has: page.getByRole('heading', { name: titulo, exact: true }) }),
    );
  }

  /** Linha de texto do cartão (descrição, "Palestrante: ...", "Local: ..."). */
  texto(conteudo: string | RegExp): Locator {
    return this.root.getByText(conteudo);
  }

  async inscrever(): Promise<void> {
    await this.botao.click();
  }
}
