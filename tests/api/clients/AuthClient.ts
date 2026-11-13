import { BaseApiClient } from './BaseApiClient';
import { env } from '../../shared/config/env';

/**
 * A aplicação autentica organizadores por sessão Django, usando o formulário
 * de login do Django Admin (/admin/login/). Não há endpoint de token.
 */
export class AuthClient extends BaseApiClient {
  /** Obtém o cookie `csrftoken` visitando a página de login (resposta pública). */
  async garantirCsrfToken(): Promise<string> {
    const atual = await this.csrfToken();
    if (atual) return atual;

    const resposta = await this.request.get('/admin/login/');
    if (!resposta.ok()) {
      throw new Error(`Não foi possível obter o token CSRF (HTTP ${resposta.status()}).`);
    }
    const token = await this.csrfToken();
    if (!token) throw new Error('A resposta de /admin/login/ não definiu o cookie csrftoken.');
    return token;
  }

  /**
   * Faz login de organizador. O Django responde 302 em caso de sucesso e
   * 200 (formulário com erro) quando as credenciais são inválidas ou a
   * conta não tem `is_staff`. A senha nunca é incluída em mensagens.
   */
  async loginOrganizador(username: string, password: string): Promise<void> {
    const token = await this.garantirCsrfToken();
    const resposta = await this.request.post('/admin/login/', {
      form: { csrfmiddlewaretoken: token, username, password, next: '/admin/' },
      headers: { Referer: `${env.apiBaseUrl}/admin/login/` },
      maxRedirects: 0,
    });

    if (resposta.status() !== 302) {
      throw new Error(
        `Login do organizador "${username}" falhou (HTTP ${resposta.status()}). ` +
          'Confira TEST_STAFF_USERNAME/TEST_STAFF_PASSWORD e se a conta possui is_staff.',
      );
    }
  }
}
