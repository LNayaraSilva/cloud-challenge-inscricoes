import type { APIResponse } from '@playwright/test';
import { test, expect } from '../fixtures/api.fixtures';
import { buildEvento } from '../data/factories';
import {
  CAMPOS_OBRIGATORIOS_EVENTO,
  CAMPOS_TEXTO_EVENTO,
  CAPACIDADES_INVALIDAS,
  DATAS_INVALIDAS,
} from '../data/payloads-invalidos';
import { erroSchema, eventoSchema, expectSchema } from '../schemas';
import type { SemanaAcademicaApi } from '../clients';
import { env } from '../../shared/config/env';
import type { ErroApi, Evento } from '../../shared/types/api';
import { sameInstant } from '../../shared/utils/data';

async function existeEventoComTitulo(api: SemanaAcademicaApi, titulo: string): Promise<boolean> {
  const eventos = (await (await api.eventos.listar()).json()) as Evento[];
  return eventos.some(evento => evento.titulo === titulo);
}

test.describe('POST /api/eventos — organizador autenticado', () => {
  test('cadastra evento e retorna 201 com id e vagas calculadas', async ({ staffApi, dados }) => {
    const payload = buildEvento({ capacidade: 25 });

    const resposta = await staffApi.eventos.criar(payload);

    expect(resposta.status()).toBe(201);
    const evento = expectSchema(eventoSchema, await resposta.json());
    dados.registrarEvento(evento.id);
    expect(evento).toMatchObject({
      titulo: payload.titulo,
      descricao: payload.descricao,
      palestrante: payload.palestrante,
      local: payload.local,
      capacidade: 25,
      vagas_disponiveis: 25,
    });
    expect(sameInstant(evento.data_inicio, payload.data_inicio)).toBe(true);
    expect(sameInstant(evento.data_fim, payload.data_fim)).toBe(true);
  });

  test('persiste o evento (consultável por GET /api/eventos/{id})', async ({ staffApi, publicApi, dados }) => {
    const resposta = await staffApi.eventos.criar(buildEvento());
    const criado = (await resposta.json()) as Evento;
    dados.registrarEvento(criado.id);

    const consulta = await publicApi.eventos.obter(criado.id);

    expect(consulta.status()).toBe(200);
    expect(await consulta.json()).toEqual(criado);
  });

  test('remove espaços extras dos campos de texto', async ({ staffApi, dados }) => {
    const base = buildEvento();
    const resposta = await staffApi.eventos.criar({
      ...base,
      titulo: `   ${base.titulo}   `,
      local: '  Auditório Principal  ',
    });

    expect(resposta.status()).toBe(201);
    const evento = (await resposta.json()) as Evento;
    dados.registrarEvento(evento.id);
    expect(evento.titulo).toBe(base.titulo);
    expect(evento.local).toBe('Auditório Principal');
  });

  test('aceita a capacidade mínima de 1 vaga (valor limite)', async ({ staffApi, dados }) => {
    const resposta = await staffApi.eventos.criar(buildEvento({ capacidade: 1 }));

    expect(resposta.status()).toBe(201);
    const evento = (await resposta.json()) as Evento;
    dados.registrarEvento(evento.id);
    expect(evento.vagas_disponiveis).toBe(1);
  });

  test('aceita datas em fusos diferentes e devolve o mesmo instante', async ({ staffApi, dados }) => {
    const payload = buildEvento({ data_inicio: '2031-05-10T22:00:00Z', data_fim: '2031-05-10T21:00:00-03:00' });

    const resposta = await staffApi.eventos.criar(payload);

    expect(resposta.status()).toBe(201);
    const evento = (await resposta.json()) as Evento;
    dados.registrarEvento(evento.id);
    expect(sameInstant(evento.data_inicio, '2031-05-10T19:00:00-03:00')).toBe(true);
    expect(sameInstant(evento.data_fim, '2031-05-11T00:00:00Z')).toBe(true);
  });
});

test.describe('POST /api/eventos — validações (400)', () => {
  async function esperarDadosInvalidos(resposta: APIResponse) {
    expect(resposta.status()).toBe(400);
    const erro = expectSchema(erroSchema, await resposta.json()) as ErroApi;
    expect(erro.erro).toBe('DADOS_INVALIDOS');
    expect(erro.mensagem).toBe('Os dados do evento são inválidos.');
    return erro;
  }

  for (const campo of CAMPOS_OBRIGATORIOS_EVENTO) {
    test(`rejeita evento sem o campo obrigatório "${campo}"`, async ({ staffApi }) => {
      const payload: Record<string, unknown> = { ...buildEvento() };
      delete payload[campo];

      const erro = await esperarDadosInvalidos(await staffApi.eventos.criar(payload));

      expect(Object.keys(erro.campos ?? {})).toContain(campo);
      expect(await existeEventoComTitulo(staffApi, String(payload.titulo))).toBe(false);
    });
  }

  for (const campo of CAMPOS_TEXTO_EVENTO) {
    test(`rejeita "${campo}" preenchido apenas com espaços`, async ({ staffApi }) => {
      const erro = await esperarDadosInvalidos(await staffApi.eventos.criar(buildEvento({ [campo]: '    ' })));

      expect(erro.campos?.[campo]).toBe('Este campo é obrigatório.');
    });
  }

  for (const { descricao, valor } of CAPACIDADES_INVALIDAS) {
    test(`rejeita capacidade ${descricao} (${JSON.stringify(valor)})`, async ({ staffApi }) => {
      const erro = await esperarDadosInvalidos(
        await staffApi.eventos.criar({ ...buildEvento(), capacidade: valor }),
      );

      expect(erro.campos?.capacidade).toBe('A capacidade deve ser um número inteiro maior que zero.');
    });
  }

  for (const { descricao, valor } of DATAS_INVALIDAS) {
    test(`rejeita data_inicio em formato inválido: ${descricao}`, async ({ staffApi }) => {
      const erro = await esperarDadosInvalidos(
        await staffApi.eventos.criar({ ...buildEvento(), data_inicio: valor }),
      );

      expect(erro.campos?.data_inicio).toMatch(/ISO 8601/);
    });
  }

  test('rejeita data de término igual à data de início', async ({ staffApi }) => {
    const inicio = '2031-06-01T10:00:00-03:00';

    const erro = await esperarDadosInvalidos(
      await staffApi.eventos.criar(buildEvento({ data_inicio: inicio, data_fim: inicio })),
    );

    expect(erro.campos?.data_fim).toBe('A data de término deve ser posterior à data de início.');
  });

  test('rejeita data de término anterior à data de início', async ({ staffApi }) => {
    const erro = await esperarDadosInvalidos(
      await staffApi.eventos.criar(
        buildEvento({ data_inicio: '2031-06-01T10:00:00-03:00', data_fim: '2031-06-01T09:59:00-03:00' }),
      ),
    );

    expect(erro.campos?.data_fim).toBe('A data de término deve ser posterior à data de início.');
  });

  test('retorna todos os campos inválidos de uma só vez', async ({ staffApi }) => {
    const erro = await esperarDadosInvalidos(
      await staffApi.eventos.criar({ titulo: '', capacidade: 0, data_inicio: 'x' }),
    );

    expect(Object.keys(erro.campos ?? {}).sort()).toEqual(
      ['capacidade', 'data_fim', 'data_inicio', 'descricao', 'local', 'palestrante', 'titulo'].sort(),
    );
  });

  test('rejeita corpo que não é JSON válido (JSON_INVALIDO)', async ({ staffApi }) => {
    const resposta = await staffApi.eventos.criar('{"titulo": "sem fechar"');

    expect(resposta.status()).toBe(400);
    expect(await resposta.json()).toEqual({
      erro: 'JSON_INVALIDO',
      mensagem: 'O corpo da requisição deve conter um JSON válido.',
    });
  });

  test('rejeita JSON que não é um objeto (lista)', async ({ staffApi }) => {
    const resposta = await staffApi.eventos.criar([buildEvento()]);

    expect(resposta.status()).toBe(400);
    expect(await resposta.json()).toEqual({
      erro: 'JSON_INVALIDO',
      mensagem: 'O corpo da requisição deve ser um objeto JSON.',
    });
  });
});

test.describe('POST /api/eventos — autorização e CSRF', () => {
  test('visitante com token CSRF válido recebe 403 ACESSO_NEGADO', async ({ publicApi }) => {
    await publicApi.auth.garantirCsrfToken();
    const payload = buildEvento();

    const resposta = await publicApi.eventos.criar(payload);

    expect(resposta.status()).toBe(403);
    expect(await resposta.json()).toEqual({
      erro: 'ACESSO_NEGADO',
      mensagem: 'Acesso permitido apenas à equipe organizadora autenticada.',
    });
    expect(await existeEventoComTitulo(publicApi, payload.titulo)).toBe(false);
  });

  test('visitante sem token CSRF é bloqueado (403)', async ({ publicApi }) => {
    const payload = buildEvento();

    const resposta = await publicApi.eventos.criar(payload, { semCsrf: true });

    expect(resposta.status()).toBe(403);
    expect(await existeEventoComTitulo(publicApi, payload.titulo)).toBe(false);
  });

  test('organizador autenticado sem token CSRF é bloqueado (403)', async ({ staffApi }) => {
    const payload = buildEvento();

    const resposta = await staffApi.eventos.criar(payload, { semCsrf: true });

    expect(resposta.status()).toBe(403);
    expect(await existeEventoComTitulo(staffApi, payload.titulo)).toBe(false);
  });

  test('métodos não suportados retornam 405', async ({ staffApi }) => {
    // Com CSRF válido a requisição chega à view (@require_http_methods(["GET", "POST"])).
    const token = await staffApi.auth.csrfToken();

    const resposta = await staffApi.request.put('/api/eventos', {
      headers: { 'X-CSRFToken': token ?? '', Referer: `${env.apiBaseUrl}/` },
      data: buildEvento(),
    });

    expect(resposta.status()).toBe(405);
  });
});
