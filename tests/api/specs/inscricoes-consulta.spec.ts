import { test, expect } from '../fixtures/api.fixtures';
import { erroSchema, expectSchema, listaInscricoesSchema } from '../schemas';

const ID_INEXISTENTE = 2_000_000_000;

test.describe('GET /api/eventos/{id}/inscricoes — restrito à organização', () => {
  test('organizador lista as inscrições do evento conforme o contrato', async ({ staffApi, dados }) => {
    const evento = await dados.criarEvento();
    const primeira = await dados.inscrever(evento.id);
    const segunda = await dados.inscrever(evento.id);

    const resposta = await staffApi.inscricoes.listar(evento.id);

    expect(resposta.status()).toBe(200);
    const inscricoes = expectSchema(listaInscricoesSchema, await resposta.json());
    // Ordenação definida no model: criada_em crescente.
    expect(inscricoes.map(item => item.id)).toEqual([primeira.id, segunda.id]);
    expect(inscricoes[0]).toEqual(primeira);
  });

  test('retorna somente inscrições do evento consultado', async ({ staffApi, dados }) => {
    const [evento, outroEvento] = await Promise.all([dados.criarEvento(), dados.criarEvento()]);
    const daqui = await dados.inscrever(evento.id);
    await dados.inscrever(outroEvento.id);

    const inscricoes = expectSchema(listaInscricoesSchema, await (await staffApi.inscricoes.listar(evento.id)).json());

    expect(inscricoes).toHaveLength(1);
    expect(inscricoes[0].id).toBe(daqui.id);
    expect(inscricoes.every(item => item.evento_id === evento.id)).toBe(true);
  });

  test('retorna lista vazia para evento sem inscrições', async ({ staffApi, dados }) => {
    const evento = await dados.criarEvento();

    const resposta = await staffApi.inscricoes.listar(evento.id);

    expect(resposta.status()).toBe(200);
    expect(await resposta.json()).toEqual([]);
  });

  test('retorna 404 para evento inexistente', async ({ staffApi }) => {
    const resposta = await staffApi.inscricoes.listar(ID_INEXISTENTE);

    expect(resposta.status()).toBe(404);
    expect(expectSchema(erroSchema, await resposta.json()).erro).toBe('EVENTO_NAO_ENCONTRADO');
  });

  test('visitante recebe 403 ACESSO_NEGADO sem vazar nomes e e-mails', async ({ publicApi, dados }) => {
    const evento = await dados.criarEvento();
    const inscricao = await dados.inscrever(evento.id);

    const resposta = await publicApi.inscricoes.listar(evento.id);

    expect(resposta.status()).toBe(403);
    const corpo = await resposta.text();
    expect(JSON.parse(corpo)).toEqual({
      erro: 'ACESSO_NEGADO',
      mensagem: 'Acesso permitido apenas à equipe organizadora autenticada.',
    });
    expect(corpo).not.toContain(inscricao.participante.email);
    expect(corpo).not.toContain(inscricao.participante.nome);
  });

  test('visitante recebe 403 mesmo para evento inexistente (não revela existência)', async ({ publicApi }) => {
    const resposta = await publicApi.inscricoes.listar(ID_INEXISTENTE);

    expect(resposta.status()).toBe(403);
  });

  for (const metodo of ['PUT', 'PATCH', 'DELETE']) {
    test(`método ${metodo} não é permitido (405)`, async ({ publicApi, dados }) => {
      const evento = await dados.criarEvento();

      const resposta = await publicApi.request.fetch(`/api/eventos/${evento.id}/inscricoes`, { method: metodo });

      expect(resposta.status()).toBe(405);
    });
  }
});
