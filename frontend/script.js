
/*
  Cloud Challenge - Semana Acadêmica
  Frontend em JavaScript
  Dados simulados para integração futura com Django
*/

// Eventos fictícios para testes
const eventos = [
    {
        id: 1,
        titulo: "Oficina de Python",
        descricao: "Introdução à programação com Python.",
        local: "Laboratório 01",
        data_inicio: "2026-12-10T19:00:00-03:00",
        capacidade: 30,
        vagas_disponiveis: 30
    },
    {
        id: 2,
        titulo: "Introdução à Inteligência Artificial",
        descricao: "Conheça os conceitos básicos de IA.",
        local: "Auditório",
        data_inicio: "2026-12-11T19:00:00-03:00",
        capacidade: 40,
        vagas_disponiveis: 15
    },
    {
        id: 3,
        titulo: "Segurança da Informação",
        descricao: "Boas práticas de segurança digital.",
        local: "Sala 05",
        data_inicio: "2026-12-12T19:00:00-03:00",
        capacidade: 25,
        vagas_disponiveis: 0
    }
];

// Elementos da página
const listaEventos = document.getElementById("lista-eventos");
const campoBusca = document.getElementById("buscar-evento");
const formulario = document.getElementById("form-inscricao");
const nomeEvento = document.getElementById("evento-selecionado");
const mensagem = document.getElementById("mensagem-inscricao");
const botaoConfirmar = document.getElementById("btn-confirmar");

const selecionarEvento = document.getElementById("selecionar-evento");
const listaParticipantes = document.getElementById("lista-participantes");
const totalInscritos = document.getElementById("total-inscritos");

// Dados simulados
const inscricoesSimuladas = new Set();
const participantesInscritos = [];

let eventoSelecionadoId = null;

// Formatar data
function formatarData(data) {
    return new Date(data).toLocaleString("pt-BR", {
        dateStyle: "short",
        timeStyle: "short"
    });
}

// Verificar se o evento já começou
function eventoEncerrado(evento) {
    return new Date(evento.data_inicio) <= new Date();
}

// Selecionar evento para inscrição
function selecionarEventoParaInscricao(id) {
    const evento = eventos.find(function(item) {
        return item.id === id;
    });

    if (!evento || eventoEncerrado(evento) ||
        evento.vagas_disponiveis <= 0) {
        return;
    }

    eventoSelecionadoId = evento.id;
    nomeEvento.textContent = evento.titulo;
    botaoConfirmar.disabled = false;

    mensagem.textContent = "";
    mensagem.style.color = "";

    document.getElementById("inscricao").scrollIntoView({
        behavior: "smooth",
        block: "center"
    });
}

// Mostrar eventos na página
function mostrarEventos(filtro = "") {
    listaEventos.innerHTML = "";

    const eventosFiltrados = eventos.filter(function(evento) {
        return evento.titulo.toLowerCase().includes(
            filtro.toLowerCase()
        );
    });

    if (eventosFiltrados.length === 0) {
        const aviso = document.createElement("p");
        aviso.textContent = "Nenhum evento encontrado.";
        listaEventos.appendChild(aviso);
        return;
    }

    eventosFiltrados.forEach(function(evento) {
        const card = document.createElement("div");
        card.className = "card-evento";

        const titulo = document.createElement("h3");
        titulo.textContent = evento.titulo;

        const descricao = document.createElement("p");
        descricao.textContent = evento.descricao;

        const data = document.createElement("p");
        data.textContent = "Data: " + formatarData(evento.data_inicio);

        const local = document.createElement("p");
        local.textContent = "Local: " + evento.local;

        const vagas = document.createElement("p");
        vagas.textContent =
            "Vagas disponíveis: " + evento.vagas_disponiveis;

        const botao = document.createElement("button");
        botao.className = "btn-inscricao";

        if (eventoEncerrado(evento)) {
            botao.textContent = "Inscrições encerradas";
            botao.disabled = true;
        } else if (evento.vagas_disponiveis <= 0) {
            botao.textContent = "Vagas esgotadas";
            botao.disabled = true;
        } else {
            botao.textContent = "Inscrever-se";

            botao.addEventListener("click", function() {
                selecionarEventoParaInscricao(evento.id);
            });
        }

        card.appendChild(titulo);
        card.appendChild(descricao);
        card.appendChild(data);
        card.appendChild(local);
        card.appendChild(vagas);
        card.appendChild(botao);

        listaEventos.appendChild(card);
    });
}

// Preencher seleção de eventos
function carregarEventosSelect() {
    selecionarEvento.innerHTML =
        '<option value="">Escolha um evento</option>';

    eventos.forEach(function(evento) {
        const opcao = document.createElement("option");
        opcao.value = evento.id;
        opcao.textContent = evento.titulo;
        selecionarEvento.appendChild(opcao);
    });
}

// Mostrar participantes do evento selecionado
function mostrarParticipantes() {
    const eventoId = Number(selecionarEvento.value);

    listaParticipantes.innerHTML = "";

    if (!selecionarEvento.value) {
        totalInscritos.textContent = "Total de inscritos: 0";

        const linha = document.createElement("tr");
        const coluna = document.createElement("td");

        coluna.colSpan = 2;
        coluna.textContent =
            "Selecione um evento para visualizar os participantes.";

        linha.appendChild(coluna);
        listaParticipantes.appendChild(linha);
        return;
    }

    const participantes = participantesInscritos.filter(function(pessoa) {
        return pessoa.eventoId === eventoId;
    });

    totalInscritos.textContent =
        "Total de inscritos: " + participantes.length;

    if (participantes.length === 0) {
        const linha = document.createElement("tr");
        const coluna = document.createElement("td");

        coluna.colSpan = 2;
        coluna.textContent =
            "Nenhum participante inscrito neste evento.";

        linha.appendChild(coluna);
        listaParticipantes.appendChild(linha);
        return;
    }

    participantes.forEach(function(pessoa) {
        const linha = document.createElement("tr");

        const colunaNome = document.createElement("td");
        colunaNome.textContent = pessoa.nome;

        const colunaEmail = document.createElement("td");
        colunaEmail.textContent = pessoa.email;

        linha.appendChild(colunaNome);
        linha.appendChild(colunaEmail);

        listaParticipantes.appendChild(linha);
    });
}

// Pesquisar eventos
campoBusca.addEventListener("input", function() {
    mostrarEventos(campoBusca.value);
});

// Atualizar tabela quando mudar o evento
selecionarEvento.addEventListener("change", mostrarParticipantes);

// Confirmar inscrição simulada
formulario.addEventListener("submit", function(event) {
    event.preventDefault();

    const nome = document.getElementById("nome").value.trim();
    const email = document.getElementById("email").value.trim().toLowerCase();

    const eventoEscolhido = eventos.find(function(item) {
        return item.id === eventoSelecionadoId;
    });

    // Validar dados
    if (!nome || !email || !eventoEscolhido) {
        mensagem.textContent = "Preencha todos os campos.";
        mensagem.style.color = "#dc2626";
        return;
    }

    // Impedir inscrição em evento passado
    if (eventoEncerrado(eventoEscolhido)) {
        mensagem.textContent = "As inscrições estão encerradas.";
        mensagem.style.color = "#dc2626";
        return;
    }

    const chaveInscricao = eventoEscolhido.id + ":" + email;

    // Impedir inscrição duplicada
    if (inscricoesSimuladas.has(chaveInscricao)) {
        mensagem.textContent =
            "Este e-mail já está inscrito neste evento.";
        mensagem.style.color = "#dc2626";
        return;
    }

    // Verificar vagas
    if (eventoEscolhido.vagas_disponiveis <= 0) {
        mensagem.textContent = "Não existem vagas disponíveis.";
        mensagem.style.color = "#dc2626";
        return;
    }

    // Registrar inscrição simulada
    inscricoesSimuladas.add(chaveInscricao);
    eventoEscolhido.vagas_disponiveis--;

    // Adicionar participante à lista
    participantesInscritos.push({
        eventoId: eventoEscolhido.id,
        nome: nome,
        email: email
    });

    // Atualizar tabela de participantes
    mostrarParticipantes();

    // Exibir sucesso
    mensagem.textContent =
        "Inscrição simulada com sucesso para " + nome + "!";
    mensagem.style.color = "#15803d";

    formulario.reset();

    // Atualizar eventos
    mostrarEventos(campoBusca.value);

    // Desabilitar inscrição se as vagas acabarem
    if (eventoEscolhido.vagas_disponiveis === 0) {
        eventoSelecionadoId = null;
        nomeEvento.textContent = "Selecione um evento";
        botaoConfirmar.disabled = true;
    }
});

// Inicializar
carregarEventosSelect();
mostrarEventos();
mostrarParticipantes();
