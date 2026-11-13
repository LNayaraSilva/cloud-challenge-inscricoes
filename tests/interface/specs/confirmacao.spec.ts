import { test, expect } from '../fixtures/ui.fixtures';

const resumoValido = () => ({
  id: 123,
  nome: 'Maria Comprovante',
  email: 'maria.comprovante@example.com',
  evento: 'Oficina de Comprovantes',
  local: 'Sala 2',
  inicio: '2031-02-20T19:00:00-03:00',
  status: 'confirmada',
  criadoEm: Date.now(),
});

test.describe('Página de comprovante (/inscricao-confirmada/)', () => {
  test('acesso direto sem inscrição mostra aviso e oculta a impressão', async ({ confirmacao, page }) => {
    await confirmacao.goto();

    await expect(confirmacao.tituloAusente).toBeVisible();
    await expect(confirmacao.tituloConfirmada).toBeHidden();
    await expect(confirmacao.imprimir).toBeHidden();

    await confirmacao.voltar.click();
    await expect(page).toHaveURL(/\/#eventos$/);
  });

  test('exibe o resumo gravado na sessão do navegador', async ({ confirmacao }) => {
    const resumo = resumoValido();
    await confirmacao.prepararResumo(resumo);

    await confirmacao.goto();

    await expect(confirmacao.tituloConfirmada).toBeVisible();
    await expect(confirmacao.evento).toHaveText(resumo.evento);
    await expect(confirmacao.nome).toHaveText(resumo.nome);
    await expect(confirmacao.email).toHaveText(resumo.email);
    await expect(confirmacao.local).toHaveText(resumo.local);
    await expect(confirmacao.data).toContainText('2031');
    await expect(confirmacao.numero).toHaveText('123');
  });

  test('descarta comprovante com mais de 30 minutos', async ({ confirmacao }) => {
    await confirmacao.prepararResumo({ ...resumoValido(), criadoEm: Date.now() - 31 * 60 * 1000 });

    await confirmacao.goto();

    await expect(confirmacao.tituloAusente).toBeVisible();
    await expect(confirmacao.tituloConfirmada).toBeHidden();
  });

  test('descarta comprovante com status diferente de "confirmada"', async ({ confirmacao }) => {
    await confirmacao.prepararResumo({ ...resumoValido(), status: 'pendente' });

    await confirmacao.goto();

    await expect(confirmacao.tituloAusente).toBeVisible();
  });
});
