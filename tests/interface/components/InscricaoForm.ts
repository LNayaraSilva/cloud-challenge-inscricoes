import type { Locator, Page } from '@playwright/test';
import type { Participante } from '../../shared/types/api';

/** Painel lateral "Inscrição no evento" da página inicial. */
export class InscricaoForm {
  readonly root: Locator;
  readonly eventoSelecionado: Locator;
  readonly nome: Locator;
  readonly email: Locator;
  readonly confirmar: Locator;
  readonly mensagem: Locator;

  constructor(page: Page) {
    this.root = page.getByRole('complementary').filter({
      has: page.getByRole('heading', { name: 'Inscrição no evento' }),
    });
    // <strong> sem papel acessível; o id é estável e usado pelo próprio script.js.
    this.eventoSelecionado = this.root.locator('#evento-selecionado');
    this.nome = this.root.getByLabel('Nome completo');
    this.email = this.root.getByLabel('E-mail');
    this.confirmar = this.root.getByRole('button', { name: /Confirmar inscrição|Confirmando/ });
    this.mensagem = this.root.getByRole('status');
  }

  async preencher(participante: Participante): Promise<void> {
    await this.nome.fill(participante.nome);
    await this.email.fill(participante.email);
  }

  async enviar(): Promise<void> {
    await this.confirmar.click();
  }

  async preencherEEnviar(participante: Participante): Promise<void> {
    await this.preencher(participante);
    await this.enviar();
  }

  /** Estado de validade nativa (HTML5) de um campo do formulário. */
  validade(campo: Locator): Promise<{ valid: boolean; valueMissing: boolean; typeMismatch: boolean }> {
    return campo.evaluate((input: HTMLInputElement) => ({
      valid: input.validity.valid,
      valueMissing: input.validity.valueMissing,
      typeMismatch: input.validity.typeMismatch,
    }));
  }
}
