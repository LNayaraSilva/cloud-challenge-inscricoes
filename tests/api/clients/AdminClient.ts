import { BaseApiClient } from './BaseApiClient';
import { env } from '../../shared/config/env';

/**
 * A API não expõe exclusão de eventos. Para limpar os dados criados pelos
 * testes usamos a confirmação de exclusão do Django Admin, que também
 * remove as inscrições do evento (on_delete=CASCADE).
 * Requer as permissões delete_evento e delete_inscricao.
 */
export class AdminClient extends BaseApiClient {
  async excluirEvento(eventoId: number): Promise<void> {
    const token = await this.csrfToken();
    if (!token) throw new Error('Sessão de organizador sem cookie csrftoken.');

    const url = `/admin/api/evento/${eventoId}/delete/`;
    const resposta = await this.request.post(url, {
      form: { csrfmiddlewaretoken: token, post: 'yes' },
      headers: { Referer: `${env.apiBaseUrl}${url}` },
      maxRedirects: 0,
    });

    // 302 = excluído; 404/redirect para a lista = já não existia.
    if (resposta.status() !== 302 && resposta.status() !== 404) {
      throw new Error(
        `Falha ao excluir o evento de teste ${eventoId} pelo Django Admin (HTTP ${resposta.status()}). ` +
          'Verifique as permissões delete_evento e delete_inscricao do organizador.',
      );
    }
  }
}
