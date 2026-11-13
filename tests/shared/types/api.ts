/** Tipos derivados de backend/api/serializers.py e backend/api/views.py. */

export interface EventoPayload {
  titulo: string;
  descricao: string;
  palestrante: string;
  local: string;
  /** ISO 8601 com fuso horário. */
  data_inicio: string;
  /** ISO 8601 com fuso horário. */
  data_fim: string;
  capacidade: number;
}

export interface Evento extends EventoPayload {
  id: number;
  vagas_disponiveis: number;
}

export interface Participante {
  nome: string;
  email: string;
}

export interface InscricaoPayload {
  participante: Participante;
}

export type StatusInscricao = 'confirmada';

export interface Inscricao {
  id: number;
  evento_id: number;
  participante: Participante;
  status: StatusInscricao;
  criada_em: string;
}

export type CodigoErro =
  | 'ACESSO_NEGADO'
  | 'JSON_INVALIDO'
  | 'DADOS_INVALIDOS'
  | 'EVENTO_NAO_ENCONTRADO'
  | 'EVENTO_INICIADO'
  | 'INSCRICAO_DUPLICADA'
  | 'VAGAS_ESGOTADAS'
  | 'INSCRICAO_NAO_ENCONTRADA';

export interface ErroApi {
  erro: CodigoErro;
  mensagem: string;
  campos?: Record<string, string | string[]>;
}
