import { test, expect } from '../fixtures/ui.fixtures';
import { MENSAGENS } from '../data/mensagens';
import type { LinkMenu } from '../pages/HomePage';

test.describe('Página inicial — carregamento e navegação', () => {
  test('exibe título, cabeçalho e seções principais', { tag: '@apresentacao' }, async ({ home, page }) => {
    await home.goto();

    await expect(page).toHaveTitle(MENSAGENS.home.titulo);
    await expect(home.cabecalho).toBeVisible();
    await expect(home.tituloEventos).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Inscrição no evento' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Sobre o projeto' })).toBeVisible();
    await expect(home.busca).toBeVisible();
  });

  test('inicia o formulário sem evento selecionado e com envio desabilitado', async ({ home }) => {
    await home.goto();

    await expect(home.formulario.eventoSelecionado).toHaveText(MENSAGENS.home.nenhumSelecionado);
    await expect(home.formulario.confirmar).toBeDisabled();
    await expect(home.formulario.nome).toBeEmpty();
    await expect(home.formulario.email).toBeEmpty();
  });

  const ancoras: { link: LinkMenu; secao: string }[] = [
    { link: 'Eventos', secao: 'eventos' },
    { link: 'Inscrições', secao: 'inscricao' },
    { link: 'Sobre', secao: 'sobre' },
    { link: 'Início', secao: 'inicio' },
  ];

  for (const { link, secao } of ancoras) {
    test(`menu "${link}" leva à seção #${secao}`, async ({ home, page }) => {
      await home.goto();

      await home.linkMenu(link).click();

      await expect(page).toHaveURL(new RegExp(`#${secao}$`));
      await expect(home.secao(secao)).toBeInViewport();
    });
  }

  test('botão "Explorar eventos" leva à lista de eventos', async ({ home, page }) => {
    await home.goto();

    await home.explorarEventos.click();

    await expect(page).toHaveURL(/#eventos$/);
    await expect(home.tituloEventos).toBeInViewport();
  });

  test('link "Área da organização" exige login de organizador', async ({ home, page }) => {
    await home.goto();

    await home.linkOrganizacao.click();

    await expect(page).toHaveURL(/\/admin\/login\/\?next=\/organizacao\/$/);
    await expect(page.getByRole('button', { name: 'Acessar' })).toBeVisible();
  });
});

test.describe('Página inicial — estados da listagem de eventos', () => {
  test('mostra "Carregando eventos..." enquanto a API não responde', async ({ home, page }) => {
    let liberarResposta!: () => void;
    const respostaLiberada = new Promise<void>(resolve => (liberarResposta = resolve));
    await page.route('**/api/eventos', async route => {
      await respostaLiberada;
      await route.fulfill({ json: [] });
    });

    await home.goto();

    await expect(home.listaEventos).toHaveText(MENSAGENS.home.carregando);
    liberarResposta();
    await expect(home.listaEventos).toHaveText(MENSAGENS.home.semEventos);
  });

  test('mostra estado vazio quando não há eventos cadastrados', async ({ home, page }) => {
    await page.route('**/api/eventos', route => route.fulfill({ json: [] }));

    await home.goto();

    await expect(home.listaEventos).toHaveText(MENSAGENS.home.semEventos);
    await expect(home.cards).toHaveCount(0);
  });

  test('mostra mensagem de erro quando a API falha', async ({ home, page }) => {
    await page.route('**/api/eventos', route =>
      route.fulfill({ status: 500, json: { erro: 'ERRO_INTERNO', mensagem: 'Falha simulada' } }),
    );

    await home.goto();

    await expect(home.listaEventos).toHaveText(MENSAGENS.home.erroCarregamento);
    await expect(home.formulario.confirmar).toBeDisabled();
  });

  test('mostra mensagem de erro quando a API devolve formato inesperado', async ({ home, page }) => {
    await page.route('**/api/eventos', route => route.fulfill({ json: { eventos: [] } }));

    await home.goto();

    await expect(home.listaEventos).toHaveText(MENSAGENS.home.erroCarregamento);
  });
});
