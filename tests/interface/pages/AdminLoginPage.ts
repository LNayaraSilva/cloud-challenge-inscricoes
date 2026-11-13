import type { Locator, Page } from '@playwright/test';

/**
 * Login do Django Admin (/admin/login/), que é a forma de autenticação
 * dos organizadores. Textos em pt-BR (LANGUAGE_CODE = "pt-br").
 */
export class AdminLoginPage {
  readonly usuario: Locator;
  readonly senha: Locator;
  readonly acessar: Locator;
  readonly erro: Locator;
  readonly encerrarSessao: Locator;

  constructor(readonly page: Page) {
    this.usuario = page.getByLabel('Usuário:');
    this.senha = page.getByLabel('Senha:');
    this.acessar = page.getByRole('button', { name: 'Acessar' });
    this.erro = page.getByText(/insira um usuário e senha corretos/i);
    this.encerrarSessao = page.getByRole('button', { name: 'Encerrar sessão' });
  }

  async goto(next?: string): Promise<void> {
    await this.page.goto(next ? `/admin/login/?next=${encodeURIComponent(next)}` : '/admin/login/');
  }

  async entrar(usuario: string, senha: string): Promise<void> {
    await this.usuario.fill(usuario);
    await this.senha.fill(senha);
    await this.acessar.click();
  }

  /** O logout do Django 5 é um POST disparado pelo botão no cabeçalho do admin. */
  async sair(): Promise<void> {
    await this.page.goto('/admin/');
    await this.encerrarSessao.click();
  }
}
