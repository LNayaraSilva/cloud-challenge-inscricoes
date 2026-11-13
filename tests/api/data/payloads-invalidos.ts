import type { EventoPayload } from '../../shared/types/api';

/** Campos obrigatórios do cadastro de evento (validar_evento em views.py). */
export const CAMPOS_OBRIGATORIOS_EVENTO: (keyof EventoPayload)[] = [
  'titulo',
  'descricao',
  'palestrante',
  'local',
  'data_inicio',
  'data_fim',
  'capacidade',
];

export const CAMPOS_TEXTO_EVENTO: (keyof EventoPayload)[] = ['titulo', 'descricao', 'palestrante', 'local'];

/** Valores rejeitados para `capacidade` (deve ser inteiro JSON >= 1). */
export const CAPACIDADES_INVALIDAS: { descricao: string; valor: unknown }[] = [
  { descricao: 'zero', valor: 0 },
  { descricao: 'negativa', valor: -5 },
  { descricao: 'decimal', valor: 1.5 },
  { descricao: 'texto numérico', valor: '10' },
  { descricao: 'booleano', valor: true },
  { descricao: 'nula', valor: null },
];

/** Datas rejeitadas: precisam ser ISO 8601 com fuso horário. */
export const DATAS_INVALIDAS: { descricao: string; valor: unknown }[] = [
  { descricao: 'sem fuso horário', valor: '2030-11-10T19:00:00' },
  { descricao: 'texto livre', valor: 'amanhã às 19h' },
  { descricao: 'formato brasileiro', valor: '10/11/2030 19:00' },
  { descricao: 'número (timestamp)', valor: 1_900_000_000 },
];

/** E-mails rejeitados pelo validate_email do Django. */
export const EMAILS_INVALIDOS: string[] = [
  'sem-arroba.example.com',
  'usuario@',
  '@example.com',
  'usuario com espaco@example.com',
  'usuario@dominio',
];
