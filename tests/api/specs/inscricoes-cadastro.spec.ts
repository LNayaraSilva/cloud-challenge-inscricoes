import type { APIResponse } from '@playwright/test';
import { test, expect } from '../fixtures/api.fixtures';
import { buildEventoIniciado, buildParticipante } from '../data/factories';
import { EMAILS_INVALIDOS } from '../data/payloads-invalidos';
import { erroSchema, expectSchema, inscricaoSchema } from '../schemas';
import type { ErroApi, Evento } from '../../shared/types/api';

const ID_INEXISTENTE = 2_000_000_000;

async function esperarErro(resposta: APIResponse, status: number, codigo: ErroApi['erro']): Promise<ErroApi> {
  expect(resposta.status(), await resposta.text()).toBe(status);
  const erro = expectSchema(erroSchema, await resposta.json()) as ErroApi;
  expect(erro.erro).toBe(codigo);
  return erro;
}

test.describe('POST /api/eventos/{id}/inscricoes — inscrição pública', () => {
  test('inscreve participante e retorna 201 com status "confirmada"', async ({ publicApi, dados }) => {
    const evento = await dados.criarEvento();
    const participante = buildParticipante();

    const resposta = await publicApi.inscricoes.inscrever(evento.id, { participante });

    expect(resposta.status()).toBe(201);
    const inscricao = expectSchema(inscricaoSchema, await resposta.json());
    expect(inscricao).toMatchObject({ evento_id: evento.id, participante, status: 'confirmada' });
    expect(Math.abs(Date.parse(inscricao.criada_em) - Date.now())).toBeLessThan(5 * 60 * 1000);
  });

  test('normaliza o e-mail (minúsculas, sem espaços) e o nome (sem espaços nas pontas)', async ({ publicApi, dados }) => {
    const evento = await dados.criarEvento();
    const { nome, email } = buildParticipante();

    const resposta = await publicApi.inscricoes.inscrever(evento.id, {
      participante: { nome: `  ${nome}  `, email: `  ${email.toUpperCase()}  ` },
    });

    expect(resposta.status()).toBe(201);
    const inscricao = expectSchema(inscricaoSchema, await resposta.json());
    expect(inscricao.participante).toEqual({ nome, email });
  });

  test('reduz em 1 as vagas disponíveis do evento', async ({ publicApi, dados }) => {
    const evento = await dados.criarEvento({ capacidade: 10 });

    await publicApi.inscricoes.inscrever(evento.id, { participante: buildParticipante() });

    const atualizado = (await (await publicApi.eventos.obter(evento.id)).json()) as Evento;
    expect(atualizado.vagas_disponiveis).toBe(9);
  });

  test('permite o mesmo e-mail em eventos diferentes', async ({ publicApi, dados }) => {
    const [eventoA, eventoB] = await Promise.all([dados.criarEvento(), dados.criarEvento()]);
    const participante = buildParticipante();

    const respostaA = await publicApi.inscricoes.inscrever(eventoA.id, { participante });
    const respostaB = await publicApi.inscricoes.inscrever(eventoB.id, { participante });

    expect(respostaA.status()).toBe(201);
    expect(respostaB.status()).toBe(201);
  });
});

test.describe('POST /api/eventos/{id}/inscricoes — regras de negócio', () => {
  test('rejeita inscrição duplicada no mesmo evento (409 INSCRICAO_DUPLICADA)', async ({ publicApi, dados }) => {
    const evento = await dados.criarEvento({ capacidade: 5 });
    const participante = buildParticipante();
    await dados.inscrever(evento.id, participante);

    const erro = await esperarErro(
      await publicApi.inscricoes.inscrever(evento.id, { participante: { nome: 'Outro Nome', email: participante.email } }),
      409,
      'INSCRICAO_DUPLICADA',
    );

    expect(erro.mensagem).toBe('Este e-mail já está inscrito no evento.');
    const atualizado = (await (await publicApi.eventos.obter(evento.id)).json()) as Evento;
    expect(atualizado.vagas_disponiveis).toBe(4);
  });

  test('detecta duplicidade sem diferenciar maiúsculas/minúsculas no e-mail', async ({ publicApi, dados }) => {
    const evento = await dados.criarEvento();
    const participante = buildParticipante();
    await dados.inscrever(evento.id, participante);

    await esperarErro(
      await publicApi.inscricoes.inscrever(evento.id, {
        participante: { ...participante, email: participante.email.toUpperCase() },
      }),
      409,
      'INSCRICAO_DUPLICADA',
    );
  });

  test('rejeita inscrição quando não há vagas (409 VAGAS_ESGOTADAS)', async ({ publicApi, dados }) => {
    const evento = await dados.criarEventoLotado(2);

    const erro = await esperarErro(
      await publicApi.inscricoes.inscrever(evento.id, { participante: buildParticipante() }),
      409,
      'VAGAS_ESGOTADAS',
    );

    expect(erro.mensagem).toBe('Não existem vagas disponíveis para este evento.');
    const atualizado = (await (await publicApi.eventos.obter(evento.id)).json()) as Evento;
    expect(atualizado.vagas_disponiveis).toBe(0);
  });

  test('rejeita inscrição em evento já iniciado (422 EVENTO_INICIADO)', async ({ staffApi, publicApi, dados }) => {
    const criacao = await staffApi.eventos.criar(buildEventoIniciado());
    expect(criacao.status()).toBe(201);
    const evento = (await criacao.json()) as Evento;
    dados.registrarEvento(evento.id);

    const erro = await esperarErro(
      await publicApi.inscricoes.inscrever(evento.id, { participante: buildParticipante() }),
      422,
      'EVENTO_INICIADO',
    );

    expect(erro.mensagem).toBe('Não é possível se inscrever em um evento iniciado.');
  });

  test('rejeita inscrição em evento inexistente (404 EVENTO_NAO_ENCONTRADO)', async ({ publicApi }) => {
    await esperarErro(
      await publicApi.inscricoes.inscrever(ID_INEXISTENTE, { participante: buildParticipante() }),
      404,
      'EVENTO_NAO_ENCONTRADO',
    );
  });

  test('na disputa pela última vaga, apenas uma inscrição é confirmada', async ({ publicApi, dados }) => {
    const evento = await dados.criarEvento({ capacidade: 1 });
    const tentativas = 5;

    const respostas = await Promise.all(
      Array.from({ length: tentativas }, () =>
        publicApi.inscricoes.inscrever(evento.id, { participante: buildParticipante() }),
      ),
    );
    const status = respostas.map(resposta => resposta.status());

    expect(status.filter(codigo => codigo === 201)).toHaveLength(1);
    expect(status.filter(codigo => codigo === 409)).toHaveLength(tentativas - 1);
    const atualizado = (await (await publicApi.eventos.obter(evento.id)).json()) as Evento;
    expect(atualizado.vagas_disponiveis).toBe(0);
  });
});

test.describe('POST /api/eventos/{id}/inscricoes — validações (400)', () => {
  test('rejeita corpo sem o objeto "participante"', async ({ publicApi, dados }) => {
    const evento = await dados.criarEvento();

    const erro = await esperarErro(await publicApi.inscricoes.inscrever(evento.id, {}), 400, 'DADOS_INVALIDOS');

    expect(erro.mensagem).toBe('Os dados do participante são inválidos.');
    expect(erro.campos).toEqual({ participante: 'Informe os dados do participante.' });
  });

  test('rejeita "participante" que não é objeto', async ({ publicApi, dados }) => {
    const evento = await dados.criarEvento();

    const erro = await esperarErro(
      await publicApi.inscricoes.inscrever(evento.id, { participante: 'Maria <maria@example.com>' }),
      400,
      'DADOS_INVALIDOS',
    );

    expect(erro.campos).toHaveProperty('participante');
  });

  test('rejeita nome e e-mail ausentes, informando os dois campos', async ({ publicApi, dados }) => {
    const evento = await dados.criarEvento();

    const erro = await esperarErro(
      await publicApi.inscricoes.inscrever(evento.id, { participante: {} }),
      400,
      'DADOS_INVALIDOS',
    );

    expect(erro.campos).toEqual({
      'participante.nome': 'O nome é obrigatório.',
      'participante.email': 'O e-mail é obrigatório.',
    });
  });

  test('rejeita nome preenchido apenas com espaços', async ({ publicApi, dados }) => {
    const evento = await dados.criarEvento();

    const erro = await esperarErro(
      await publicApi.inscricoes.inscrever(evento.id, { participante: buildParticipante({ nome: '   ' }) }),
      400,
      'DADOS_INVALIDOS',
    );

    expect(erro.campos).toEqual({ 'participante.nome': 'O nome é obrigatório.' });
  });

  for (const email of EMAILS_INVALIDOS) {
    test(`rejeita e-mail inválido "${email}"`, async ({ publicApi, dados }) => {
      const evento = await dados.criarEvento();

      const erro = await esperarErro(
        await publicApi.inscricoes.inscrever(evento.id, { participante: buildParticipante({ email }) }),
        400,
        'DADOS_INVALIDOS',
      );

      expect(erro.campos).toEqual({ 'participante.email': 'Informe um e-mail válido.' });
    });
  }

  test('rejeita JSON malformado (JSON_INVALIDO) sem criar inscrição', async ({ publicApi, dados }) => {
    const evento = await dados.criarEvento({ capacidade: 3 });

    const erro = await esperarErro(
      await publicApi.inscricoes.inscrever(evento.id, '{"participante": '),
      400,
      'JSON_INVALIDO',
    );

    expect(erro.mensagem).toBe('O corpo da requisição deve conter um JSON válido.');
    const atualizado = (await (await publicApi.eventos.obter(evento.id)).json()) as Evento;
    expect(atualizado.vagas_disponiveis).toBe(3);
  });

  test('rejeita JSON que não é objeto (lista)', async ({ publicApi, dados }) => {
    const evento = await dados.criarEvento();

    const erro = await esperarErro(
      await publicApi.inscricoes.inscrever(evento.id, [{ participante: buildParticipante() }]),
      400,
      'JSON_INVALIDO',
    );

    expect(erro.mensagem).toBe('O corpo da requisição deve ser um objeto JSON.');
  });

  test('valida o corpo antes de verificar a existência do evento', async ({ publicApi }) => {
    // Comportamento observado em views.py: dados inválidos => 400, mesmo para evento inexistente.
    await esperarErro(await publicApi.inscricoes.inscrever(ID_INEXISTENTE, { participante: {} }), 400, 'DADOS_INVALIDOS');
  });
});
