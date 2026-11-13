import type { EventoPayload, Participante } from '../../shared/types/api';
import { isoFromNow, uniqueSuffix } from '../../shared/utils/data';

/**
 * Evento válido e único, começando em 10 dias (aceita inscrições).
 * Os textos incluem o sufixo para permitir buscas sem ambiguidade.
 */
export function buildEvento(overrides: Partial<EventoPayload> = {}): EventoPayload {
  const id = uniqueSuffix();
  return {
    titulo: `Oficina E2E ${id}`,
    descricao: `Evento criado pela automação de testes ${id}`,
    palestrante: `Palestrante ${id}`,
    local: 'Laboratório 01',
    data_inicio: isoFromNow({ days: 10 }),
    data_fim: isoFromNow({ days: 10, hours: 2 }),
    capacidade: 30,
    ...overrides,
  };
}

/** Evento que já começou (inscrições encerradas pela regra de negócio). */
export function buildEventoIniciado(overrides: Partial<EventoPayload> = {}): EventoPayload {
  return buildEvento({
    data_inicio: isoFromNow({ hours: -1 }),
    data_fim: isoFromNow({ hours: 1 }),
    ...overrides,
  });
}

/** Participante único; usa o domínio reservado example.com. */
export function buildParticipante(overrides: Partial<Participante> = {}): Participante {
  const id = uniqueSuffix();
  return {
    nome: `Participante Teste ${id}`,
    email: `participante.${id}@example.com`,
    ...overrides,
  };
}
