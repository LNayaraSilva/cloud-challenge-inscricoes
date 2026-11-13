import { test, expect } from '../fixtures/api.fixtures';
import { buildParticipante } from '../data/factories';
import { erroSchema, expectSchema } from '../schemas';
import type { Evento, Inscricao } from '../../shared/types/api';

const ID_INEXISTENTE = 2_000_000_000;

test.describe('DELETE /api/inscricoes/{id} — organizador', () => {
  test('cancela a inscrição com 204 e corpo vazio', async ({ staffApi, dados }) => {
    const evento = await dados.criarEvento();
    const inscricao = await dados.inscrever(evento.id);

    const resposta = await staffApi.inscricoes.cancelar(inscricao.id);

    expect(resposta.status()).toBe(204);
    expect(await resposta.text()).toBe('');
    const restantes = (await (await staffApi.inscricoes.listar(evento.id)).json()) as Inscricao[];
    expect(restantes.map(item => item.id)).not.toContain(inscricao.id);
  });

  test('libera a vaga para um novo participante em evento lotado', async ({ staffApi, publicApi, dados }) => {
    const evento = await dados.criarEvento({ capacidade: 1 });
    const inscricao = await dados.inscrever(evento.id);
    const bloqueada = await publicApi.inscricoes.inscrever(evento.id, { participante: buildParticipante() });
    expect(bloqueada.status()).toBe(409);

    await staffApi.inscricoes.cancelar(inscricao.id);

    const aposCancelar = (await (await publicApi.eventos.obter(evento.id)).json()) as Evento;
    expect(aposCancelar.vagas_disponiveis).toBe(1);
    const nova = await publicApi.inscricoes.inscrever(evento.id, { participante: buildParticipante() });
    expect(nova.status()).toBe(201);
  });

  test('permite que o mesmo e-mail se inscreva novamente após o cancelamento', async ({ staffApi, publicApi, dados }) => {
    const evento = await dados.criarEvento();
    const participante = buildParticipante();
    const inscricao = await dados.inscrever(evento.id, participante);

    await staffApi.inscricoes.cancelar(inscricao.id);
    const novamente = await publicApi.inscricoes.inscrever(evento.id, { participante });

    expect(novamente.status()).toBe(201);
  });

  test('cancelar duas vezes retorna 404 INSCRICAO_NAO_ENCONTRADA', async ({ staffApi, dados }) => {
    const evento = await dados.criarEvento();
    const inscricao = await dados.inscrever(evento.id);
    await staffApi.inscricoes.cancelar(inscricao.id);

    const resposta = await staffApi.inscricoes.cancelar(inscricao.id);

    expect(resposta.status()).toBe(404);
    expect(expectSchema(erroSchema, await resposta.json())).toEqual({
      erro: 'INSCRICAO_NAO_ENCONTRADA',
      mensagem: 'Inscrição não encontrada.',
    });
  });

  test('retorna 404 para inscrição inexistente', async ({ staffApi }) => {
    const resposta = await staffApi.inscricoes.cancelar(ID_INEXISTENTE);

    expect(resposta.status()).toBe(404);
  });
});

test.describe('DELETE /api/inscricoes/{id} — autorização e CSRF', () => {
  test('visitante com token CSRF recebe 403 e a inscrição é mantida', async ({ publicApi, staffApi, dados }) => {
    const evento = await dados.criarEvento();
    const inscricao = await dados.inscrever(evento.id);
    await publicApi.auth.garantirCsrfToken();

    const resposta = await publicApi.inscricoes.cancelar(inscricao.id);

    expect(resposta.status()).toBe(403);
    expect(expectSchema(erroSchema, await resposta.json()).erro).toBe('ACESSO_NEGADO');
    const inscricoes = (await (await staffApi.inscricoes.listar(evento.id)).json()) as Inscricao[];
    expect(inscricoes.map(item => item.id)).toContain(inscricao.id);
  });

  test('organizador sem token CSRF é bloqueado (403) e a inscrição é mantida', async ({ staffApi, dados }) => {
    const evento = await dados.criarEvento();
    const inscricao = await dados.inscrever(evento.id);

    const resposta = await staffApi.inscricoes.cancelar(inscricao.id, { semCsrf: true });

    expect(resposta.status()).toBe(403);
    const inscricoes = (await (await staffApi.inscricoes.listar(evento.id)).json()) as Inscricao[];
    expect(inscricoes.map(item => item.id)).toContain(inscricao.id);
  });

  test('GET na rota de cancelamento não é permitido (405)', async ({ staffApi, dados }) => {
    const evento = await dados.criarEvento();
    const inscricao = await dados.inscrever(evento.id);

    const resposta = await staffApi.request.get(`/api/inscricoes/${inscricao.id}`);

    expect(resposta.status()).toBe(405);
  });
});
