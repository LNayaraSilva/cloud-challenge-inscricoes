// Modo apresentação: roda os testes de Interface com o navegador visível,
// um teste por vez, em câmera lenta e com o nome do cenário na tela.
//
// Uso:
//   npm run test:demo                         -> roteiro marcado com @apresentacao
//   npm run test:demo -- inscricao.spec.ts    -> outro arquivo/filtro (args do Playwright)
//   PW_SLOW_MO=1200 npm run test:demo         -> mais lento (padrão 700 ms por ação)
//   PW_DEMO_PAUSE=4000 npm run test:demo      -> pausa maior no fim de cada teste

import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const cli = path.join(rootDir, 'node_modules', '@playwright', 'test', 'cli.js');

const argsUsuario = process.argv.slice(2);
const filtro = argsUsuario.length ? argsUsuario : ['--grep', '@apresentacao'];

const args = [
  cli,
  'test',
  '--project=interface',
  '--headed',
  '--workers=1',
  '--retries=0',
  // Só a saída no terminal: não sobrescreve os relatórios HTML/JUnit da suíte.
  '--reporter=list',
  ...filtro,
];

const filho = spawn(process.execPath, args, {
  cwd: rootDir,
  stdio: 'inherit',
  env: {
    ...process.env,
    PW_SLOW_MO: process.env.PW_SLOW_MO ?? '700',
    PW_DEMO_PAUSE: process.env.PW_DEMO_PAUSE ?? '2500',
  },
});

filho.on('exit', codigo => process.exit(codigo ?? 1));
