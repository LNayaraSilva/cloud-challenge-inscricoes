import type { Locator, Page } from '@playwright/test';
import { EventoCard } from '../components/EventoCard';
import { InscricaoForm } from '../components/InscricaoForm';
import { PlanilhaInscricoes } from '../components/PlanilhaInscricoes';

export type LinkMenu = 'Início' | 'Eventos' | 'Inscrições' | 'Sobre';

/** Página pública "/" (frontend/index.html + script.js). */
export class HomePage {
  readonly cabecalho: Locator;
  readonly menu: Locator;
  readonly explorarEventos: Locator;
  readonly tituloEventos: Locator;
  readonly busca: Locator;
  readonly listaEventos: Locator;
  readonly cards: Locator;
  readonly linkOrganizacao: Locator;
  readonly formulario: InscricaoForm;
  readonly planilha: PlanilhaInscricoes;

  constructor(readonly page: Page) {
    this.cabecalho = page.getByRole('heading', { level: 1, name: 'Semana Acadêmica' });
    this.menu = page.getByRole('navigation');
    this.explorarEventos = page.getByRole('link', { name: 'Explorar eventos' });
    this.tituloEventos = page.getByRole('heading', { name: 'Eventos disponíveis' });
    this.busca = page.getByRole('searchbox', { name: 'Buscar evento' });
    // Contêiner sem papel acessível; o id é o mesmo usado pelo script.js.
    this.listaEventos = page.locator('#lista-eventos');
    this.cards = this.listaEventos.getByRole('article');
    this.linkOrganizacao = page.getByRole('contentinfo').getByRole('link', { name: 'Área da organização' });
    this.formulario = new InscricaoForm(page);
    this.planilha = new PlanilhaInscricoes(page);
  }

  async goto(): Promise<void> {
    await this.page.goto('/');
  }

  card(titulo: string): EventoCard {
    return EventoCard.porTitulo(this.page, titulo);
  }

  linkMenu(nome: LinkMenu): Locator {
    return this.menu.getByRole('link', { name: nome, exact: true });
  }

  secao(ancora: string): Locator {
    return this.page.locator(`#${ancora}`);
  }

  async buscar(termo: string): Promise<void> {
    await this.busca.fill(termo);
  }

  /** Seleciona o evento pelo botão "Inscrever-se" do cartão. */
  async selecionarEvento(titulo: string): Promise<void> {
    await this.card(titulo).inscrever();
  }
}
