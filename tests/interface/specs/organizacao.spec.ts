import { test, expect } from '../fixtures/ui.fixtures';
import { MENSAGENS } from '../data/mensagens';
import { buildParticipante } from '../../api/data/factories';
import { exibirSomenteEventos } from '../fixtures/rede';
import { env, hasStaffCredentials, MISSING_STAFF_MESSAGE } from '../../shared/config/env';

test.describe('Área da organização — autenticação', () => {
  test('visitante é redirecionado ao login do organizador', async ({ organizacao, adminLogin, page }) => {
    await organizacao.goto();

    await expect(page).toHaveURL(/\/admin\/login\/\?next=\/organizacao\/$/);
    await expect(adminLogin.usuario).toBeVisible();
    await expect(organizacao.titulo).toBeHidden();
  });

  test('credenciais inválidas exibem erro e não concedem acesso', async ({ adminLogin, page }) => {
    await adminLogin.goto('/organizacao/');

    await adminLogin.entrar('usuario-inexistente', 'senha-incorreta');

    await expect(adminLogin.erro).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/login\//);
  });

  test('organizador entra pela interface, acessa o painel e encerra a sessão', { tag: '@apresentacao' }, async ({ adminLogin, organizacao, page }) => {
    test.skip(!hasStaffCredentials, MISSING_STAFF_MESSAGE);
    await adminLogin.goto('/organizacao/');

    await adminLogin.entrar(env.staff.username, env.staff.password);

    await expect(page).toHaveURL(/\/organizacao\/$/);
    await expect(organizacao.titulo).toBeVisible();

    await adminLogin.sair();
    await organizacao.goto();

    await expect(page).toHaveURL(/\/admin\/login\/\?next=\/organizacao\/$/);
  });
});

test.describe('Área da organização — painel de inscritos', () => {
  test.use({ autenticado: true });

  test('lista as inscrições com nome, e-mail, evento e status', async ({ organizacao, page, dados }) => {
    const evento = await dados.criarEvento();
    const inscricao = await dados.inscrever(evento.id);
    await exibirSomenteEventos(page, [evento.id]);

    await organizacao.goto();
    const linha = organizacao.linhaCom(inscricao.participante.email);

    await expect(organizacao.status).toHaveText(MENSAGENS.organizacao.listaAtualizada);
    await expect(linha.getByRole('cell')).toHaveText([
      String(inscricao.id),
      inscricao.participante.nome,
      inscricao.participante.email,
      evento.titulo,
      'confirmada',
      /^\d{2}\/\d{2}\/\d{4},? \d{2}:\d{2}$/,
    ]);
  });

  test('pesquisa por e-mail e informa quando não há resultados', async ({ organizacao, page, dados }) => {
    const evento = await dados.criarEvento();
    const [alvo] = await Promise.all([dados.inscrever(evento.id), dados.inscrever(evento.id)]);
    await exibirSomenteEventos(page, [evento.id]);
    await organizacao.goto();
    await expect(organizacao.status).toHaveText(MENSAGENS.organizacao.listaAtualizada);

    await organizacao.pesquisar(alvo.participante.email.toUpperCase());

    await expect(organizacao.linhasDados).toHaveCount(1);
    await expect(organizacao.linhaCom(alvo.participante.email)).toBeVisible();
    await expect(organizacao.resumo).toHaveText('1 inscrição(ões) exibida(s) de 2 no total.');

    await organizacao.pesquisar('ninguem-com-este-termo');

    await expect(organizacao.linhasDados).toHaveText([MENSAGENS.organizacao.semResultado]);
  });

  test('filtra as inscrições por evento', { tag: '@apresentacao' }, async ({ organizacao, page, dados }) => {
    const [evento, outroEvento] = await Promise.all([dados.criarEvento(), dados.criarEvento()]);
    const inscricoes = [await dados.inscrever(evento.id), await dados.inscrever(evento.id)];
    const deOutroEvento = await dados.inscrever(outroEvento.id);
    await exibirSomenteEventos(page, [evento.id, outroEvento.id]);
    await organizacao.goto();
    await expect(organizacao.linhasDados).toHaveCount(3);
    await expect(organizacao.status).toHaveText(MENSAGENS.organizacao.listaAtualizada);

    await organizacao.filtrarPorEvento(evento.titulo);

    await expect(organizacao.linhasDados).toHaveCount(2);
    for (const inscricao of inscricoes) {
      await expect(organizacao.linhaCom(inscricao.participante.email)).toBeVisible();
    }
    await expect(organizacao.linhaCom(deOutroEvento.participante.email)).toHaveCount(0);
    await expect(organizacao.resumo).toHaveText('2 inscrição(ões) exibida(s) de 3 no total.');
  });

  test('botão "Atualizar" carrega inscrições feitas após abrir o painel', async ({ organizacao, page, dados }) => {
    const evento = await dados.criarEvento();
    await exibirSomenteEventos(page, [evento.id]);
    await organizacao.goto();
    await expect(organizacao.status).toHaveText(MENSAGENS.organizacao.listaAtualizada);
    const nova = buildParticipante();
    await dados.inscrever(evento.id, nova);
    await expect(organizacao.linhaCom(nova.email)).toHaveCount(0);

    await organizacao.atualizar.click();

    await expect(organizacao.linhaCom(nova.email)).toBeVisible();
    await expect(organizacao.atualizar).toBeEnabled();
  });

  test('mostra erro se a sessão perder acesso à API', async ({ organizacao, page }) => {
    await page.route('**/api/eventos/*/inscricoes', route =>
      route.fulfill({ status: 403, json: { erro: 'ACESSO_NEGADO', mensagem: 'negado' } }),
    );
    await page.route('**/api/eventos', route => route.fulfill({ json: [{ id: 1, titulo: 'Qualquer' }] }));

    await organizacao.goto();

    await expect(organizacao.status).toHaveText('Acesso restrito. Entre como organizador para visualizar os inscritos.');
    await expect(organizacao.resumo).toHaveText('Inscrições indisponíveis.');
  });

  test('link "Voltar aos eventos" retorna à página inicial', async ({ organizacao, page }) => {
    await organizacao.goto();

    await organizacao.voltar.click();

    await expect(page).toHaveURL(`${env.baseUrl}/`);
    await expect(page.getByRole('heading', { level: 1, name: 'Semana Acadêmica' })).toBeVisible();
  });
});
