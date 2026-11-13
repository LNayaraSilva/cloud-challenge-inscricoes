import { expect } from '@playwright/test';
import { z } from 'zod';

/**
 * Contratos de resposta baseados em backend/api/serializers.py.
 * Objetos estritos: campos inesperados (ex.: vazamento de dados) quebram o teste.
 */

/** Datas são serializadas com timezone.localtime(...).isoformat(): sempre com fuso. */
const dataIsoComFuso = z.iso.datetime({ offset: true });

export const eventoSchema = z
  .strictObject({
    id: z.number().int().positive(),
    titulo: z.string().min(1),
    descricao: z.string().min(1),
    palestrante: z.string().min(1),
    local: z.string().min(1),
    data_inicio: dataIsoComFuso,
    data_fim: dataIsoComFuso,
    capacidade: z.number().int().positive(),
    vagas_disponiveis: z.number().int().nonnegative(),
  })
  .refine(evento => evento.vagas_disponiveis <= evento.capacidade, {
    message: 'vagas_disponiveis não pode ser maior que a capacidade',
  })
  .refine(evento => Date.parse(evento.data_fim) > Date.parse(evento.data_inicio), {
    message: 'data_fim deve ser posterior a data_inicio',
  });

export const listaEventosSchema = z.array(eventoSchema);

export const inscricaoSchema = z.strictObject({
  id: z.number().int().positive(),
  evento_id: z.number().int().positive(),
  participante: z.strictObject({
    nome: z.string().min(1),
    email: z.email(),
  }),
  status: z.literal('confirmada'),
  criada_em: dataIsoComFuso,
});

export const listaInscricoesSchema = z.array(inscricaoSchema);

export const erroSchema = z.strictObject({
  erro: z.enum([
    'ACESSO_NEGADO',
    'JSON_INVALIDO',
    'DADOS_INVALIDOS',
    'EVENTO_NAO_ENCONTRADO',
    'EVENTO_INICIADO',
    'INSCRICAO_DUPLICADA',
    'VAGAS_ESGOTADAS',
    'INSCRICAO_NAO_ENCONTRADA',
  ]),
  mensagem: z.string().min(1),
  campos: z.record(z.string(), z.union([z.string(), z.array(z.string())])).optional(),
});

export const healthSchema = z.strictObject({ status: z.literal('ok') });

/** Valida `dados` contra o schema, exibindo os desvios de contrato de forma legível. */
export function expectSchema<T extends z.ZodType>(schema: T, dados: unknown): z.infer<T> {
  const resultado = schema.safeParse(dados);
  expect(
    resultado.success,
    resultado.success ? '' : `Resposta fora do contrato:\n${z.prettifyError(resultado.error)}`,
  ).toBe(true);
  return resultado.data as z.infer<T>;
}
