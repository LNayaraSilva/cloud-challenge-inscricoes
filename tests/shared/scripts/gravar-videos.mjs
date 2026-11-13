// Grava os vídeos de demonstração usados em docs/apresentacao-tecnica.html.
//
//   npm run videos:apresentacao
//
// Gera em docs/videos/:
//   ui-mode-api.webm        -> interface gráfica do Playwright (UI Mode) rodando os testes de API
//   ui-mode-interface.webm  -> UI Mode rodando o roteiro de Interface e mostrando os passos na tela real
//   interface-*.webm        -> navegador executando as jornadas na aplicação real (câmera lenta)
//
// Tudo roda contra o Django real, com o banco descartável da automação.

import { spawn, spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('@playwright/test');

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const cli = path.join(raiz, 'node_modules', '@playwright', 'test', 'cli.js');
const saida = path.join(raiz, 'docs', 'videos');
// Fora de test-results: o UI Mode limpa essa pasta ao carregar e, no Windows,
// um vídeo em gravação lá dentro bloqueia a limpeza (o UI Mode trava em "Loading…").
const temporario = path.join(os.tmpdir(), 'cloud-challenge-gravacao-videos');

const PORTA_UI = process.env.VIDEO_UI_PORT ?? '8091';
const PORTA_APP_UI = process.env.VIDEO_APP_PORT_UI ?? '8013';
const PORTA_APP_NAVEGADOR = process.env.VIDEO_APP_PORT_NAVEGADOR ?? '8014';
const TELA = { width: 1440, height: 810 };

const NOMES_INTERFACE = {
  'visitante se inscreve e recebe o comprovante com os dados confirmados': 'interface-jornada-inscricao',
  'organizador entra pela interface, acessa o painel e encerra a sessão': 'interface-login-organizador',
  'exibe erro ao tentar inscrever um e-mail já inscrito no evento': 'interface-email-duplicado',
  'filtra as inscrições por evento': 'interface-filtro-painel',
  'não envia com e-mail em formato inválido': 'interface-email-invalido',
  'filtra pelo título do evento': 'interface-busca-eventos',
  'bloqueia inscrição em evento sem vagas': 'interface-evento-lotado',
  'exibe o cartão com os dados reais do evento cadastrado': 'interface-cartao-evento',
  'exibe título, cabeçalho e seções principais': 'interface-pagina-inicial',
};

const esperar = ms => new Promise(resolve => setTimeout(resolve, ms));

function encerrarArvore(processo) {
  if (!processo?.pid) return;
  if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(processo.pid), '/T', '/F'], { stdio: 'ignore' });
  else processo.kill('SIGTERM');
}

/* ----------------------------- UI Mode ----------------------------- */

async function iniciarUiMode() {
  const processo = spawn(process.execPath, [cli, 'test', `--ui-port=${PORTA_UI}`, '--ui-host=127.0.0.1'], {
    cwd: raiz,
    // O trace exibe o texto digitado no login: usamos uma senha obviamente descartável,
    // válida apenas no banco temporário desta gravação (BASE_URL vazia = servidor local).
    env: {
      ...process.env,
      BASE_URL: '',
      E2E_PORT: PORTA_APP_UI,
      PW_SLOW_MO: '',
      PW_VIDEO: '',
      // Menos navegadores abrindo ao mesmo tempo: o UI Mode já consome recursos
      // e, com 7 workers, a abertura simultânea do Chromium estourava o tempo limite.
      PW_WORKERS: process.env.PW_WORKERS ?? '3',
      TEST_STAFF_USERNAME: 'organizador_demo',
      TEST_STAFF_PASSWORD: 'senha-descartavel-de-teste',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  await new Promise((resolve, reject) => {
    const limite = setTimeout(() => reject(new Error('UI Mode não iniciou em 2 minutos.')), 120_000);
    processo.stdout.on('data', dado => {
      if (String(dado).includes('Listening on')) { clearTimeout(limite); resolve(); }
    });
    processo.stderr.on('data', dado => process.stderr.write(dado));
    processo.on('exit', codigo => reject(new Error(`UI Mode encerrou com código ${codigo}.`)));
  });
  return processo;
}

/** Legenda fixa no rodapé do vídeo. */
async function legenda(page, texto) {
  await page.evaluate(conteudo => {
    let caixa = document.getElementById('__legenda-video');
    if (!caixa) {
      caixa = document.createElement('div');
      caixa.id = '__legenda-video';
      caixa.style.cssText =
        'position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:2147483647;pointer-events:none;' +
        'background:rgba(23,38,31,.92);color:#fff;padding:12px 22px;border-radius:12px;max-width:80%;' +
        'font:600 20px/1.35 "Segoe UI",Arial,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.35);border-left:6px solid #f59e0b';
      document.body.appendChild(caixa);
    }
    caixa.textContent = conteudo;
  }, texto);
}

/** Destaca visualmente o ponto do clique (vídeos headless não mostram cursor). */
async function clicar(page, alvo, pausa = 900) {
  await alvo.scrollIntoViewIfNeeded();
  const caixa = await alvo.boundingBox();
  if (caixa) {
    await page.evaluate(({ x, y }) => {
      const marca = document.createElement('div');
      marca.style.cssText =
        `position:fixed;left:${x - 20}px;top:${y - 20}px;width:40px;height:40px;border-radius:50%;` +
        'border:4px solid #f59e0b;background:rgba(245,158,11,.25);z-index:2147483646;pointer-events:none;' +
        'transition:transform .5s ease-out,opacity .5s ease-out';
      document.body.appendChild(marca);
      setTimeout(() => { marca.style.transform = 'scale(1.7)'; marca.style.opacity = '0'; }, 350);
      setTimeout(() => marca.remove(), 950);
    }, { x: caixa.x + caixa.width / 2, y: caixa.y + caixa.height / 2 });
    await page.waitForTimeout(450);
  }
  await alvo.click();
  await page.waitForTimeout(pausa);
}

async function abrirUiMode(page) {
  await page.goto(`http://127.0.0.1:${PORTA_UI}`);
  // A árvore está pronta quando o botão "Run all" fica habilitado.
  try {
    await page.locator('button[title^="Run all"]:not([disabled])').waitFor({ timeout: 90_000 });
  } catch (erro) {
    await page.screenshot({ path: path.join(temporario, 'falha-ui-mode.png') });
    console.error('[videos] Estado do UI Mode:', (await page.locator('body').innerText()).slice(0, 600));
    throw erro;
  }
  await page.waitForTimeout(800);
}

async function executarTodos(page) {
  await clicar(page, page.getByRole('button', { name: /^Run all/ }), 300);
  await page.getByText(/^Running \d+\/\d+/).waitFor({ timeout: 60_000 });
  await page.getByText(/^Running \d+\/\d+/).waitFor({ state: 'hidden', timeout: 600_000 });
  await page.waitForTimeout(1200);
  // Um vídeo de demonstração nunca deve exibir falhas sem que alguém perceba.
  const falhas = await page.getByRole('treeitem', { name: /^\[icon-(error|circle-slash)\]/ }).allInnerTexts();
  if (falhas.length) throw new Error(`Testes falharam durante a gravação:\n${falhas.join('\n')}`);
}

/** Percorre os passos registrados do teste selecionado, exibindo o snapshot de cada um. */
async function percorrerAcoes(page, { pausa = 1100, maximo = 30 } = {}) {
  const acoes = page.getByRole('tabpanel', { name: 'Actions' }).getByRole('treeitem');
  await acoes.first().waitFor();
  const total = Math.min(await acoes.count(), maximo);
  for (let i = 1; i < total; i++) {
    await acoes.nth(i).scrollIntoViewIfNeeded();
    await acoes.nth(i).click();
    await page.waitForTimeout(pausa);
  }
}

async function gravar(browser, nome, roteiro) {
  const contexto = await browser.newContext({ viewport: TELA, recordVideo: { dir: temporario, size: TELA } });
  const page = await contexto.newPage();
  try {
    await roteiro(page);
  } finally {
    const video = page.video();
    await contexto.close();
    await video.saveAs(path.join(saida, `${nome}.webm`));
    console.log(`[videos] ${nome}.webm`);
  }
}

async function roteiroApi(page) {
  await abrirUiMode(page);
  await legenda(page, 'Playwright UI Mode · projeto "api" · 88 testes da API REST');
  await clicar(page, page.getByRole('button', { name: 'Expand all' }), 1500);

  await legenda(page, 'Executando os testes de API contra o servidor Django real...');
  await executarTodos(page);

  await legenda(page, 'Resultado: todos os cenários de API concluídos');
  await page.getByRole('tree').first().evaluate(arvore => arvore.scrollTo({ top: 0 }));
  await page.waitForTimeout(2500);

  await legenda(page, 'Concorrência: 5 inscrições simultâneas disputando a última vaga');
  await clicar(page, page.getByRole('treeitem', { name: /na disputa pela última vaga/ }), 1500);
  await clicar(page, page.getByRole('tab', { name: /^Network/ }), 3500);

  await legenda(page, 'Regra de negócio: e-mail duplicado no mesmo evento → 409 INSCRICAO_DUPLICADA');
  await clicar(page, page.getByRole('treeitem', { name: /rejeita inscrição duplicada no mesmo evento/ }), 1500);
  await clicar(page, page.getByRole('tab', { name: /^Source/ }), 3500);

  await legenda(page, 'Segurança: visitante recebe 403 e nenhum nome ou e-mail é exposto');
  await clicar(page, page.getByRole('treeitem', { name: /visitante recebe 403 ACESSO_NEGADO sem vazar/ }), 3500);
}

async function roteiroInterface(page) {
  await abrirUiMode(page);
  await legenda(page, 'Playwright UI Mode · selecionando o projeto "interface"');
  await clicar(page, page.getByRole('button', { name: 'Expand', exact: true }), 700);
  await clicar(page, page.getByRole('checkbox', { name: 'api', exact: true }), 500);
  await clicar(page, page.getByRole('checkbox', { name: 'interface', exact: true }), 900);
  await clicar(page, page.getByRole('button', { name: 'Collapse', exact: true }), 500);

  await legenda(page, 'Filtrando o roteiro de demonstração pela tag @apresentacao');
  const filtro = page.getByRole('searchbox', { name: /Filter \(e\.g\./ });
  await clicar(page, filtro, 200);
  await filtro.pressSequentially('@apresentacao', { delay: 90 });
  await clicar(page, page.getByRole('button', { name: 'Expand all' }), 1500);

  await legenda(page, 'Executando as jornadas no Chromium contra a aplicação real...');
  await executarTodos(page);
  await legenda(page, 'Resultado: jornadas de interface concluídas');
  await page.waitForTimeout(2500);

  await legenda(page, 'Jornada do visitante: escolher evento → preencher → comprovante (telas reais)');
  await clicar(page, page.getByRole('treeitem', { name: /visitante se inscreve/ }), 1200);
  await percorrerAcoes(page, { pausa: 1150, maximo: 26 });

  await legenda(page, 'Organizador: login → painel restrito de inscritos → logout');
  await clicar(page, page.getByRole('treeitem', { name: /organizador entra pela interface/ }), 1200);
  await percorrerAcoes(page, { pausa: 1300, maximo: 16 });
  await page.waitForTimeout(1500);
}

/* ------------------------- Navegador (tela real) ------------------------- */

function gravarNavegador() {
  const relatorio = path.join(temporario, 'resultado.json');
  const resultado = spawnSync(process.execPath, [
    cli, 'test', '--project=interface', '--grep', '@apresentacao', '--workers=1', '--retries=0',
    '--reporter=json', `--output=${path.join(temporario, 'navegador')}`,
  ], {
    cwd: raiz,
    stdio: ['ignore', 'ignore', 'inherit'],
    env: {
      ...process.env,
      E2E_PORT: PORTA_APP_NAVEGADOR,
      PW_SLOW_MO: process.env.PW_SLOW_MO ?? '1200',
      PW_DEMO_PAUSE: process.env.PW_DEMO_PAUSE ?? '3000',
      PW_VIDEO: 'on',
      PLAYWRIGHT_JSON_OUTPUT_FILE: relatorio,
    },
  });
  if (!existsSync(relatorio)) throw new Error(`Execução do navegador falhou (código ${resultado.status}).`);

  const dados = JSON.parse(readFileSync(relatorio, 'utf-8'));
  const visitar = suite => {
    for (const spec of suite.specs ?? []) {
      const video = spec.tests?.[0]?.results?.[0]?.attachments?.find(anexo => anexo.name === 'video');
      const nome = NOMES_INTERFACE[spec.title];
      if (video?.path && nome) {
        copyFileSync(video.path, path.join(saida, `${nome}.webm`));
        console.log(`[videos] ${nome}.webm`);
      }
    }
    (suite.suites ?? []).forEach(visitar);
  };
  dados.suites.forEach(visitar);
  if (resultado.status !== 0) throw new Error('Algum teste falhou durante a gravação; confira a saída acima.');
}

/* ------------------------------- Principal ------------------------------- */

// VIDEOS=navegador,ui-api,ui-interface (padrão: todos) permite regravar só uma parte.
const etapas = new Set((process.env.VIDEOS ?? 'navegador,ui-api,ui-interface').split(',').map(e => e.trim()));

rmSync(temporario, { recursive: true, force: true });
mkdirSync(saida, { recursive: true });
mkdirSync(temporario, { recursive: true });

if (etapas.has('navegador')) {
  console.log('[videos] Gravando o navegador nas jornadas reais...');
  gravarNavegador();
}

const roteirosUi = [
  ['ui-api', 'ui-mode-api', roteiroApi],
  ['ui-interface', 'ui-mode-interface', roteiroInterface],
];
for (const [etapa, nome, roteiro] of roteirosUi) {
  if (!etapas.has(etapa)) continue;
  // Uma instância do UI Mode por vídeo: estado limpo a cada gravação.
  console.log(`[videos] Iniciando o Playwright UI Mode para ${nome}...`);
  const uiMode = await iniciarUiMode();
  const browser = await chromium.launch();
  try {
    await gravar(browser, nome, roteiro);
  } finally {
    await browser.close();
    encerrarArvore(uiMode);
    await esperar(1500);
  }
}
console.log(`[videos] Concluído: ${saida}`);
