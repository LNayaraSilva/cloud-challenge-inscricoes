import { randomUUID } from 'node:crypto';

/** Sufixo curto e único para evitar colisão de dados entre testes paralelos. */
export function uniqueSuffix(): string {
  return randomUUID().slice(0, 8);
}

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/** Data ISO 8601 (UTC, com fuso "Z") deslocada a partir de agora. */
export function isoFromNow(offset: { days?: number; hours?: number }): string {
  const delta = (offset.days ?? 0) * DAY_MS + (offset.hours ?? 0) * HOUR_MS;
  return new Date(Date.now() + delta).toISOString();
}

/** Compara dois instantes ISO 8601 independentemente do fuso de representação. */
export function sameInstant(a: string, b: string): boolean {
  return Date.parse(a) === Date.parse(b);
}
