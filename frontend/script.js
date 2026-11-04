
/*
  Cloud Challenge - Semana Acadêmica
  Frontend em JavaScript
  Dados simulados para integração futura com Django
*/

// Eventos fictícios
const eventos = [
    {
        id: 1,
        titulo: "Oficina de Python",
        descricao: "Introdução à programação com Python.",
        local: "Laboratório 01",
        data_inicio: "2026-11-10T19:00:00-03:00",
        capacidade: 30,
        vagas_disponiveis: 30
    },
    {
        id: 2,
        titulo: "Introdução à Inteligência Artificial",
        descricao: "Conheça os conceitos básicos de IA.",
        local: "Auditório",
        data_inicio: "2026-11-11T19:00:00-03:00",
        capacidade: 40,
        vagas_disponiveis: 15
    },
    {
        id: 3,
        titulo: "Segurança da Informação",
        descricao: "Boas práticas de segurança digital.",
        local: "Sala 05",
        data_inicio: "2026-11-12T19:00:00-03:00",
        capacidade: 25,
        vagas_disponiveis: 0
    }
];

const listaEventos = document.getElementById("lista-eventos");
const campoBusca = document.getElementById("buscar-evento");
const formulario = document.getElementById("form-inscricao");
const nomeEvento = document.getElementById("evento-selecionado");
const mensagem = document.getElementById("mensagem-inscricao");
const botaoConfirmar = document.getElementById("btn-confirmar");

// Inscrições simuladas nesta sessão da página
const inscricoesSimuladas = new Set();

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

// Selecionar evento
function selecionarEvento(id) {
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

    document.getElementById("inscricao").scrollIntoView({
        behavior: "smooth",
        block: "center"
    });
}

// Exibir eventos
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
                selecionarEvento(evento.id);
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

// Pesquisa de eventos
campoBusca.addEventListener("input", function() {
    mostrarEventos(campoBusca.value);
});

// Simular inscrição
formulario.addEventListener("submit", function(event) {
    event.preventDefault();

    const nome = document.getElementById("nome").value.trim();
    const email = document.getElementById("email").value.trim().toLowerCase();

    const eventoEscolhido = eventos.find(function(item) {
        return item.id === eventoSelecionadoId;
    });

    if (!nome || !email || !eventoEscolhido) {
        mensagem.textContent = "Preencha todos os campos.";
        mensagem.style.color = "#dc2626";
        return;
    }

    if (eventoEncerrado(eventoEscolhido)) {
        mensagem.textContent = "As inscrições estão encerradas.";
        mensagem.style.color = "#dc2626";
        return;
    }

    const chaveInscricao = eventoEscolhido.id + ":" + email;

    if (inscricoesSimuladas.has(chaveInscricao)) {
        mensagem.textContent = "Este e-mail já está inscrito neste evento.";
        mensagem.style.color = "#dc2626";
        return;
    }

    if (eventoEscolhido.vagas_disponiveis <= 0) {
        mensagem.textContent = "Não existem vagas disponíveis.";
        mensagem.style.color = "#dc2626";
        return;
    }

    inscricoesSimuladas.add(chaveInscricao);
    eventoEscolhido.vagas_disponiveis--;

    mensagem.textContent =
        "Inscrição simulada com sucesso para " + nome + "!";
    mensagem.style.color = "#15803d";

    formulario.reset();

    // Atualizar os cartões mantendo a pesquisa atual
    mostrarEventos(campoBusca.value);

    if (eventoEscolhido.vagas_disponiveis === 0) {
        eventoSelecionadoId = null;
        nomeEvento.textContent = "Selecione um evento";
        botaoConfirmar.disabled = true;
    }
});

// Inicializar a página
mostrarEventos();
