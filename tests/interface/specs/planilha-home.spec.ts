import { test, expect } from '../fixtures/ui.fixtures';
import { MENSAGENS } from '../data/mensagens';
import { exibirSomenteEventos } from '../fixtures/rede';

test.describe('Tabela de inscrições na página inicial — visitante', () => {
  test('não exibe dados pessoais e orienta o login do organizador', async ({ home, page, dados }) => {
    const evento = await dados.criarEvento();
    const inscricao = await dados.inscrever(evento.id);
    await exibirSomenteEventos(page, [evento.id]);

    await home.goto();

    await expect(home.planilha.estado).toHaveText(MENSAGENS.planilhaHome.estadoRestrito);
    await expect(home.planilha.linkLogin).toBeVisible();
    await expect(home.planilha.tabela).not.toContainText(inscricao.participante.email);
    await expect(page.getByText(inscricao.participante.email)).toHaveCount(0);
  });

  test('link de login leva ao login do organizador retornando à tabela', async ({ home, page, dados }) => {
    // O aviso de acesso restrito só aparece quando existe ao menos um evento:
    // sem eventos o script não consulta a rota protegida de inscrições.
    const evento = await dados.criarEvento();
    await exibirSomenteEventos(page, [evento.id]);
    await home.goto();

    await home.planilha.linkLogin.click();

    await expect(page).toHaveURL(/\/admin\/login\/\?next=%2F%23planilha-inscricoes$/);
  });

  test('textos acentuados da seção são exibidos corretamente', async ({ home }) => {
    // DEFEITO CONHECIDO: frontend/index.html e o bloco INSCRICOES_NA_HOME_V1 de
    // frontend/script.js foram salvos com dupla codificação UTF-8 (mojibake):
    // o título aparece como "InscriÃ§Ãµes realizadas". Remova o test.fail
    // quando os arquivos forem corrigidos.
    test.fail(true, 'Defeito: textos com dupla codificação UTF-8 na tabela da home');

    await home.goto();

    await expect(home.planilha.titulo).toHaveText('Inscrições realizadas', { timeout: 2_000 });
  });
});

test.describe('Tabela de inscrições na página inicial — organizador', () => {
  test.use({ autenticado: true });

  test('exibe as inscrições ao organizador autenticado', async ({ home, page, dados }) => {
    const evento = await dados.criarEvento();
    const inscricao = await dados.inscrever(evento.id);
    await exibirSomenteEventos(page, [evento.id]);

    await home.goto();
    const linha = home.planilha.linhaCom(inscricao.participante.email);

    await expect(linha).toBeVisible();
    await expect(linha).toContainText(inscricao.participante.nome);
    await expect(linha).toContainText(evento.titulo);
    await expect(home.planilha.linkLogin).toBeHidden();
  });
});
