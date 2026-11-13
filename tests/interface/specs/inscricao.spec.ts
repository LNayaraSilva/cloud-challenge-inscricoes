import { test, expect } from '../fixtures/ui.fixtures';
import { MENSAGENS } from '../data/mensagens';
import { buildParticipante } from '../../api/data/factories';
import type { Evento, Inscricao } from '../../shared/types/api';

test.describe('Formulário de inscrição', () => {
  test('selecionar um evento preenche o painel e habilita o envio', async ({ home, dados }) => {
    const evento = await dados.criarEvento();
    await home.goto();

    await home.selecionarEvento(evento.titulo);

    await expect(home.formulario.eventoSelecionado).toHaveText(evento.titulo);
    await expect(home.formulario.confirmar).toBeEnabled();
  });

  test('não envia com o nome em branco (campo obrigatório)', async ({ home, page, dados }) => {
    const evento = await dados.criarEvento();
    const envios: string[] = [];
    page.on('request', req => {
      if (req.method() === 'POST') envios.push(req.url());
    });
    await home.goto();
    await home.selecionarEvento(evento.titulo);

    await home.formulario.preencherEEnviar({ nome: '', email: buildParticipante().email });

    expect(await home.formulario.validade(home.formulario.nome)).toMatchObject({ valid: false, valueMissing: true });
    await expect(page).toHaveURL(/\/$/);
    expect(envios).toEqual([]);
  });

  test('não envia com e-mail em formato inválido', { tag: '@apresentacao' }, async ({ home, page, dados }) => {
    const evento = await dados.criarEvento();
    const envios: string[] = [];
    page.on('request', req => {
      if (req.method() === 'POST') envios.push(req.url());
    });
    await home.goto();
    await home.selecionarEvento(evento.titulo);

    await home.formulario.preencherEEnviar({ nome: 'Maria Teste', email: 'maria-sem-arroba' });

    expect(await home.formulario.validade(home.formulario.email)).toMatchObject({ valid: false, typeMismatch: true });
    expect(envios).toEqual([]);
  });

  test('desabilita o botão e indica "Confirmando..." durante o envio', async ({ home, page, dados }) => {
    const evento = await dados.criarEvento();
    let liberarEnvio!: () => void;
    const envioLiberado = new Promise<void>(resolve => (liberarEnvio = resolve));
    await page.route('**/api/eventos/*/inscricoes', async route => {
      await envioLiberado;
      await route.continue();
    });
    await home.goto();
    await home.selecionarEvento(evento.titulo);

    await home.formulario.preencherEEnviar(buildParticipante());

    await expect(home.formulario.confirmar).toHaveText(MENSAGENS.formulario.confirmando);
    await expect(home.formulario.confirmar).toBeDisabled();
    await expect(page.locator('#form-inscricao')).toHaveAttribute('aria-busy', 'true');
    liberarEnvio();
    await expect(page).toHaveURL(/\/inscricao-confirmada\/$/);
  });
});

test.describe('Jornada de inscrição', () => {
  test('visitante se inscreve e recebe o comprovante com os dados confirmados', { tag: '@apresentacao' }, async ({
    home,
    confirmacao,
    page,
    staffApi,
    publicApi,
    dados,
  }) => {
    const evento = await dados.criarEvento({ capacidade: 10, local: 'Laboratório 07' });
    const participante = buildParticipante();
    await home.goto();

    await home.selecionarEvento(evento.titulo);
    // E-mail digitado em maiúsculas: a aplicação normaliza para minúsculas.
    await home.formulario.preencherEEnviar({ ...participante, email: participante.email.toUpperCase() });

    await expect(page).toHaveURL(/\/inscricao-confirmada\/$/);
    await expect(confirmacao.tituloConfirmada).toBeVisible();
    await expect(confirmacao.evento).toHaveText(evento.titulo);
    await expect(confirmacao.nome).toHaveText(participante.nome);
    await expect(confirmacao.email).toHaveText(participante.email);
    await expect(confirmacao.local).toHaveText('Laboratório 07');
    await expect(confirmacao.situacao).toHaveText('Confirmada');
    await expect(confirmacao.numero).toHaveText(/^\d+$/);
    await expect(confirmacao.imprimir).toBeVisible();

    // A inscrição foi de fato persistida pela API.
    const inscricoes = (await (await staffApi.inscricoes.listar(evento.id)).json()) as Inscricao[];
    expect(inscricoes).toHaveLength(1);
    expect(inscricoes[0]).toMatchObject({ participante, status: 'confirmada' });
    await expect(confirmacao.numero).toHaveText(String(inscricoes[0].id));
    const atualizado = (await (await publicApi.eventos.obter(evento.id)).json()) as Evento;
    expect(atualizado.vagas_disponiveis).toBe(9);

    // Retorno à vitrine com as vagas atualizadas.
    await confirmacao.voltar.click();
    await expect(page).toHaveURL(/\/#eventos$/);
    await expect(home.card(evento.titulo).vagas).toHaveText('Vagas disponíveis: 9');
  });

  test('exibe erro ao tentar inscrever um e-mail já inscrito no evento', { tag: '@apresentacao' }, async ({ home, page, dados }) => {
    const evento = await dados.criarEvento();
    const participante = buildParticipante();
    await dados.inscrever(evento.id, participante);
    await home.goto();

    await home.selecionarEvento(evento.titulo);
    await home.formulario.preencherEEnviar({ ...participante, nome: 'Outra Pessoa' });

    await expect(home.formulario.mensagem).toHaveText(MENSAGENS.api.duplicada);
    await expect(home.formulario.mensagem).toHaveClass('mensagem-erro');
    await expect(page).toHaveURL(/\/$/);
    // O formulário preserva os dados para correção.
    await expect(home.formulario.email).toHaveValue(participante.email);
  });

  test('exibe erro quando a última vaga é ocupada após a página carregar', async ({ home, page, dados }) => {
    const evento = await dados.criarEvento({ capacidade: 1 });
    await home.goto();
    await expect(home.card(evento.titulo).vagas).toHaveText('Vagas disponíveis: 1');

    // Outra pessoa ocupa a vaga enquanto o visitante preenche o formulário.
    await dados.inscrever(evento.id);
    await home.selecionarEvento(evento.titulo);
    await home.formulario.preencherEEnviar(buildParticipante());

    await expect(home.formulario.mensagem).toHaveText(MENSAGENS.api.esgotada);
    await expect(page).toHaveURL(/\/$/);
  });
});
