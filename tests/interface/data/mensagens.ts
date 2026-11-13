/** Textos exibidos pela interface (frontend/*.html e frontend/*.js). */
export const MENSAGENS = {
  home: {
    titulo: 'Cloud Challenge | Semana Acadêmica',
    carregando: 'Carregando eventos...',
    semEventos: 'Ainda não há eventos cadastrados.',
    buscaSemResultado: 'Nenhum evento encontrado para essa busca.',
    erroCarregamento: 'Não foi possível carregar os eventos. Verifique sua conexão e atualize a página.',
    nenhumSelecionado: 'Selecione um evento',
  },
  botoesCard: {
    disponivel: 'Inscrever-se',
    esgotado: 'Vagas esgotadas',
    encerrado: 'Inscrições encerradas',
  },
  formulario: {
    confirmar: 'Confirmar inscrição',
    confirmando: 'Confirmando...',
  },
  api: {
    duplicada: 'Este e-mail já está inscrito no evento.',
    esgotada: 'Não existem vagas disponíveis para este evento.',
  },
  confirmacao: {
    titulo: 'Inscrição confirmada!',
    ausente: 'Nenhuma inscrição para exibir',
  },
  planilhaHome: {
    estadoRestrito: 'Somente a equipe organizadora pode visualizar os inscritos.',
    linkLogin: 'entre como organizador',
  },
  organizacao: {
    titulo: 'Inscrições por evento',
    listaAtualizada: 'Lista atualizada.',
    semResultado: 'Nenhuma inscrição encontrada com esses filtros.',
  },
} as const;
