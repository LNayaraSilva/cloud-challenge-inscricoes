import type { APIResponse } from '@playwright/test';
import type { SemanaAcademicaApi } from '../clients';
import { buildEvento, buildParticipante } from '../data/factories';
import type { Evento, EventoPayload, Inscricao, Participante } from '../../shared/types/api';

async function exigirStatus(resposta: APIResponse, esperado: number, acao: string): Promise<void> {
  if (resposta.status() !== esperado) {
    throw new Error(`Pré-condição falhou ao ${acao}: HTTP ${resposta.status()} — ${await resposta.text()}`);
  }
}

/**
 * Prepara massas de dados pela própria API e remove tudo ao final do teste.
 * Usado tanto pelos testes de API quanto pelos de Interface.
 */
export class TestDataManager {
  private readonly eventosCriados = new Set<number>();

  constructor(
    private readonly staff: SemanaAcademicaApi,
    private readonly publico: SemanaAcademicaApi,
  ) {}

  /** Cria um evento (por padrão futuro e com 30 vagas) e registra para limpeza. */
  async criarEvento(overrides: Partial<EventoPayload> = {}): Promise<Evento> {
    const resposta = await this.staff.eventos.criar(buildEvento(overrides));
    await exigirStatus(resposta, 201, 'criar evento');
    const evento = (await resposta.json()) as Evento;
    this.eventosCriados.add(evento.id);
    return evento;
  }

  /** Registra o id de um evento criado diretamente pelo teste, para limpeza. */
  registrarEvento(eventoId: number): void {
    this.eventosCriados.add(eventoId);
  }

  /** Inscrição pública bem-sucedida (pré-condição de outros cenários). */
  async inscrever(eventoId: number, participante: Participante = buildParticipante()): Promise<Inscricao> {
    const resposta = await this.publico.inscricoes.inscrever(eventoId, { participante });
    await exigirStatus(resposta, 201, 'inscrever participante');
    return (await resposta.json()) as Inscricao;
  }

  /** Evento cujas vagas já foram todas preenchidas. */
  async criarEventoLotado(capacidade = 1): Promise<Evento> {
    const evento = await this.criarEvento({ capacidade });
    for (let i = 0; i < capacidade; i++) await this.inscrever(evento.id);
    return evento;
  }

  async limpar(): Promise<void> {
    const erros: string[] = [];
    for (const eventoId of this.eventosCriados) {
      try {
        await this.staff.admin.excluirEvento(eventoId);
      } catch (erro) {
        erros.push((erro as Error).message);
      }
    }
    this.eventosCriados.clear();
    if (erros.length) throw new Error(`Limpeza dos dados de teste incompleta:\n${erros.join('\n')}`);
  }
}
