import { test, expect } from '../fixtures/ui.fixtures';
import { MENSAGENS } from '../data/mensagens';
import { buildEventoIniciado } from '../../api/data/factories';
import type { Evento } from '../../shared/types/api';

test.describe('Vitrine de eventos', () => {
  test('exibe o cartão com os dados reais do evento cadastrado', { tag: '@apresentacao' }, async ({ home, dados }) => {
    const evento = await dados.criarEvento({
      capacidade: 40,
      local: 'Auditório Central',
      data_inicio: '2031-01-15T19:00:00-03:00',
      data_fim: '2031-01-15T21:30:00-03:00',
    });

    await home.goto();
    const card = home.card(evento.titulo);

    await expect(card.root).toBeVisible();
    await expect(card.texto(evento.descricao)).toBeVisible();
    await expect(card.texto(`Palestrante: ${evento.palestrante}`)).toBeVisible();
    await expect(card.texto('Local: Auditório Central')).toBeVisible();
    await expect(card.inicio).toHaveText(/^Início: 15\/01\/2031,? 19:00$/);
    await expect(card.termino).toHaveText(/^Término: 15\/01\/2031,? 21:30$/);
    await expect(card.vagas).toHaveText('Vagas disponíveis: 40');
    await expect(card.botao).toHaveText(MENSAGENS.botoesCard.disponivel);
    await expect(card.botao).toBeEnabled();
  });

  test('mostra as vagas descontando as inscrições confirmadas', async ({ home, dados }) => {
    const evento = await dados.criarEvento({ capacidade: 5 });
    await dados.inscrever(evento.id);
    await dados.inscrever(evento.id);

    await home.goto();

    await expect(home.card(evento.titulo).vagas).toHaveText('Vagas disponíveis: 3');
  });

  test('bloqueia inscrição em evento sem vagas', { tag: '@apresentacao' }, async ({ home, dados }) => {
    const evento = await dados.criarEventoLotado(1);

    await home.goto();
    const card = home.card(evento.titulo);

    await expect(card.vagas).toHaveText('Vagas disponíveis: 0');
    await expect(card.botao).toHaveText(MENSAGENS.botoesCard.esgotado);
    await expect(card.botao).toBeDisabled();
  });

  test('bloqueia inscrição em evento já iniciado', async ({ home, staffApi, dados }) => {
    const resposta = await staffApi.eventos.criar(buildEventoIniciado());
    const evento = (await resposta.json()) as Evento;
    dados.registrarEvento(evento.id);

    await home.goto();
    const card = home.card(evento.titulo);

    await expect(card.botao).toHaveText(MENSAGENS.botoesCard.encerrado);
    await expect(card.botao).toBeDisabled();
  });
});

test.describe('Busca de eventos', () => {
  test('filtra pelo título do evento', { tag: '@apresentacao' }, async ({ home, dados }) => {
    const [alvo, outro] = await Promise.all([dados.criarEvento(), dados.criarEvento()]);
    await home.goto();
    await expect(home.card(outro.titulo).root).toBeVisible();

    await home.buscar(alvo.titulo);

    await expect(home.cards).toHaveCount(1);
    await expect(home.card(alvo.titulo).root).toBeVisible();
  });

  test('filtra pelo palestrante, sem diferenciar maiúsculas/minúsculas', async ({ home, dados }) => {
    const evento = await dados.criarEvento();
    await home.goto();

    await home.buscar(evento.palestrante.toUpperCase());

    await expect(home.cards).toHaveCount(1);
    await expect(home.card(evento.titulo).root).toBeVisible();
  });

  test('informa quando nenhum evento corresponde à busca e restaura ao limpar', async ({ home, dados }) => {
    const evento = await dados.criarEvento();
    await home.goto();

    await home.buscar('termo-que-nao-existe-em-nenhum-evento');

    await expect(home.cards).toHaveCount(0);
    await expect(home.listaEventos).toHaveText(MENSAGENS.home.buscaSemResultado);

    await home.buscar('');

    await expect(home.card(evento.titulo).root).toBeVisible();
  });
});
