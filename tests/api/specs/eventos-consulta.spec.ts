import { test, expect } from '../fixtures/api.fixtures';
import { erroSchema, eventoSchema, expectSchema, listaEventosSchema } from '../schemas';
import type { Evento } from '../../shared/types/api';
import { sameInstant } from '../../shared/utils/data';

const ID_INEXISTENTE = 2_000_000_000;

test.describe('GET /api/eventos (público)', () => {
  test('lista eventos respeitando o contrato', async ({ publicApi, dados }) => {
    await dados.criarEvento();

    const resposta = await publicApi.eventos.listar();

    expect(resposta.status()).toBe(200);
    expect(resposta.headers()['content-type']).toContain('application/json');
    const eventos = expectSchema(listaEventosSchema, await resposta.json());
    expect(eventos.length).toBeGreaterThan(0);
  });

  test('inclui evento recém-cadastrado com todas as vagas disponíveis', async ({ publicApi, dados }) => {
    const criado = await dados.criarEvento({ capacidade: 12 });

    const eventos = (await (await publicApi.eventos.listar()).json()) as Evento[];
    const listado = eventos.find(evento => evento.id === criado.id);

    expect(listado, `evento ${criado.id} deveria estar na listagem`).toBeDefined();
    expect(listado).toMatchObject({ titulo: criado.titulo, capacidade: 12, vagas_disponiveis: 12 });
  });

  test('ordena os eventos pela data de início (crescente)', async ({ publicApi, dados }) => {
    // DEFEITO CONHECIDO: Evento.Meta.ordering = ["data_inicio"], porém a view usa
    // .annotate(Count(...)) e o Django descarta o Meta.ordering em consultas com
    // GROUP BY. O SQL gerado não possui ORDER BY. Correção sugerida na view:
    // Evento.objects.annotate(...).order_by("data_inicio").
    // Remova o test.fail quando a aplicação for corrigida.
    test.fail(true, 'Defeito: GET /api/eventos não aplica ORDER BY data_inicio');

    // Criados fora de ordem para provar que a ordenação vem do servidor.
    const tardio = await dados.criarEvento({ data_inicio: '2031-03-01T10:00:00-03:00', data_fim: '2031-03-01T12:00:00-03:00' });
    const cedo = await dados.criarEvento({ data_inicio: '2031-01-01T10:00:00-03:00', data_fim: '2031-01-01T12:00:00-03:00' });

    const eventos = (await (await publicApi.eventos.listar()).json()) as Evento[];
    const ids = eventos.map(evento => evento.id);

    expect(ids.indexOf(cedo.id), 'evento mais cedo deve vir antes').toBeLessThan(ids.indexOf(tardio.id));
    const inicios = eventos.map(evento => Date.parse(evento.data_inicio));
    expect(inicios).toEqual([...inicios].sort((a, b) => a - b));
  });

  test('calcula vagas disponíveis a partir das inscrições confirmadas', async ({ publicApi, dados }) => {
    const evento = await dados.criarEvento({ capacidade: 3 });
    await dados.inscrever(evento.id);
    await dados.inscrever(evento.id);

    const eventos = (await (await publicApi.eventos.listar()).json()) as Evento[];

    expect(eventos.find(item => item.id === evento.id)?.vagas_disponiveis).toBe(1);
  });

  test('não expõe dados pessoais dos inscritos', async ({ publicApi, dados }) => {
    const evento = await dados.criarEvento();
    const inscricao = await dados.inscrever(evento.id);

    const corpo = await (await publicApi.eventos.listar()).text();

    expect(corpo).not.toContain(inscricao.participante.email);
  });
});

test.describe('GET /api/eventos/{id} (público)', () => {
  test('retorna o evento com os dados cadastrados', async ({ publicApi, dados }) => {
    const criado = await dados.criarEvento();

    const resposta = await publicApi.eventos.obter(criado.id);

    expect(resposta.status()).toBe(200);
    const evento = expectSchema(eventoSchema, await resposta.json());
    expect(evento).toEqual(criado);
  });

  test('reflete a redução de vagas após uma inscrição', async ({ publicApi, dados }) => {
    const criado = await dados.criarEvento({ capacidade: 5 });
    await dados.inscrever(criado.id);

    const evento = (await (await publicApi.eventos.obter(criado.id)).json()) as Evento;

    expect(evento.vagas_disponiveis).toBe(4);
    expect(evento.capacidade).toBe(5);
    expect(sameInstant(evento.data_inicio, criado.data_inicio)).toBe(true);
  });

  test('responde 404 EVENTO_NAO_ENCONTRADO para id inexistente', async ({ publicApi }) => {
    const resposta = await publicApi.eventos.obter(ID_INEXISTENTE);

    expect(resposta.status()).toBe(404);
    const erro = expectSchema(erroSchema, await resposta.json());
    expect(erro).toEqual({ erro: 'EVENTO_NAO_ENCONTRADO', mensagem: 'Evento não encontrado.' });
  });

  test('responde 404 para id não numérico (rota exige inteiro)', async ({ publicApi }) => {
    const resposta = await publicApi.eventos.obter('abc');

    expect(resposta.status()).toBe(404);
  });
});
