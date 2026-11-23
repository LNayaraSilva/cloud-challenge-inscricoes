
"use strict";

const $ = id => document.getElementById(id);

const el = {
  lista: $("lista-eventos"),
  busca: $("buscar-evento"),
  form: $("form-inscricao"),
  nome: $("nome"),
  email: $("email"),
  selecionado: $("evento-selecionado"),
  mensagem: $("mensagem-inscricao"),
  botao: $("btn-confirmar"),
  select: $("selecionar-evento"),
  participantes: $("lista-participantes"),
  total: $("total-inscritos"),
  aviso: $("aviso-api")
};

let eventos = [];
let selecionadoId = null;
let disponivel = false;
let enviando = false;

function dataFormatada(valor) {
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return "Data a confirmar";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Recife"
  }).format(data);
}

function situacao(evento) {
  const data = new Date(evento.data_inicio);

  if (Number.isNaN(data.getTime()) || data <= new Date()) {
    return "Encerrado";
  }

  if (Number(evento.vagas_disponiveis) <= 0) {
    return "Esgotado";
  }

  return "Com vagas";
}

function aviso(texto) {
  el.aviso.textContent = texto;
  el.aviso.hidden = !texto;
}

function mensagem(texto, tipo = "info") {
  el.mensagem.textContent = texto;
  el.mensagem.className = "mensagem-inscricao " + tipo;
}

function elemento(tag, classe, texto) {
  const novo = document.createElement(tag);
  if (classe) novo.className = classe;
  if (texto !== undefined) novo.textContent = texto;
  return novo;
}

function selecionar(id) {
  const evento = eventos.find(e => String(e.id) === String(id));

  if (!evento || !disponivel || situacao(evento) !== "Com vagas") {
    return;
  }

  selecionadoId = evento.id;
  el.selecionado.textContent = evento.titulo;
  el.botao.disabled = false;
  mensagem("");

  $("inscricao").scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

function desenhar() {
  const termo = el.busca.value.trim().toLocaleLowerCase("pt-BR");
  el.lista.replaceChildren();

  const filtrados = eventos.filter(evento =>
    [
      evento.titulo,
      evento.descricao,
      evento.local,
      evento.palestrante
    ].join(" ").toLocaleLowerCase("pt-BR").includes(termo)
  );

  if (!filtrados.length) {
    el.lista.appendChild(
      elemento(
        "p",
        "",
        eventos.length
          ? "Nenhum evento corresponde à busca."
          : "Nenhum evento cadastrado."
      )
    );
    return;
  }

  for (const evento of filtrados) {
    const card = elemento("article", "evento-card card-evento");

    card.append(
      elemento("span", "card-situacao", situacao(evento)),
      elemento("h3", "", evento.titulo),
      elemento("p", "", evento.descricao || "Detalhes em breve."),
      elemento("p", "", `📅 ${dataFormatada(evento.data_inicio)}`),
      elemento("p", "", `📍 ${evento.local || "A confirmar"}`),
      elemento(
        "p",
        "",
        `${evento.vagas_disponiveis} de ${evento.capacidade} vagas disponíveis`
      )
    );

    if (evento.palestrante) {
      card.appendChild(
        elemento("p", "", `🎤 ${evento.palestrante}`)
      );
    }

    const botao = elemento(
      "button",
      "btn-inscricao",
      situacao(evento) === "Com vagas"
        ? "Quero me inscrever →"
        : "Inscrições indisponíveis"
    );

    botao.type = "button";
    botao.disabled = !disponivel || situacao(evento) !== "Com vagas";
    botao.addEventListener("click", () => selecionar(evento.id));
    card.appendChild(botao);

    const participantes = elemento(
      "button",
      "btn-participantes",
      "Ver participantes"
    );

    participantes.type = "button";
    participantes.addEventListener("click", () => {
      el.select.value = String(evento.id);
      consultarParticipantes();

      $("participantes").scrollIntoView({
        behavior: "smooth"
      });
    });

    card.appendChild(participantes);
    el.lista.appendChild(card);
  }
}

async function carregarEventos() {
  try {
    const resposta = await fetch("/api/eventos", {
      headers: { Accept: "application/json" },
      cache: "no-store"
    });

    if (!resposta.ok) {
      throw new Error(`HTTP ${resposta.status}`);
    }

    const dados = await resposta.json();

    if (!Array.isArray(dados)) {
      throw new Error("Resposta de eventos inválida");
    }

    eventos = dados;
    disponivel = true;
    aviso("");

  } catch (erro) {
    console.warn(erro);
    eventos = [];
    disponivel = false;

    aviso(
      "Não foi possível consultar a API Django. " +
      "As inscrições estão indisponíveis."
    );
  }

  selecionadoId = null;
  el.selecionado.textContent = "Selecione um evento";
  el.botao.disabled = true;

  el.select.replaceChildren(
    new Option("Escolha um evento", "")
  );

  for (const evento of eventos) {
    el.select.add(
      new Option(evento.titulo, String(evento.id))
    );
  }

  desenhar();
  limparParticipantes(
    "Selecione um evento para visualizar os participantes."
  );
}

function limparParticipantes(texto) {
  el.participantes.replaceChildren();

  const linha = elemento("tr");
  const coluna = elemento("td", "", texto);

  coluna.colSpan = 2;
  linha.appendChild(coluna);
  el.participantes.appendChild(linha);

  el.total.textContent = "Total de inscritos: 0";
}

async function consultarParticipantes() {
  const id = el.select.value;

  if (!id) {
    limparParticipantes(
      "Selecione um evento para visualizar os participantes."
    );
    return;
  }

  limparParticipantes("Carregando participantes...");

  try {
    const resposta = await fetch(
      `/api/eventos/${encodeURIComponent(id)}/inscricoes`,
      {
        headers: { Accept: "application/json" },
        cache: "no-store"
      }
    );

    const dados = await resposta.json();

    if (!resposta.ok) {
      throw new Error(dados.mensagem || `HTTP ${resposta.status}`);
    }

    if (!Array.isArray(dados)) {
      throw new Error("Formato inesperado da API");
    }

    const confirmados = dados.filter(
      participante =>
        String(participante.status).toLowerCase() === "confirmada"
    );

    el.total.textContent =
      `Total de inscritos: ${confirmados.length}`;

    el.participantes.replaceChildren();

    if (!confirmados.length) {
      limparParticipantes(
        "Nenhum participante confirmado neste evento."
      );
      return;
    }

    for (const participante of confirmados) {
      const linha = elemento("tr");

      linha.append(
        elemento(
          "td",
          "",
          participante.participante?.nome || "Não informado"
        ),
        elemento(
          "td",
          "",
          participante.participante?.email || "Não informado"
        )
      );

      el.participantes.appendChild(linha);
    }

  } catch (erro) {
    limparParticipantes(
      "Não foi possível carregar os participantes: " + erro.message
    );
  }
}

el.form.addEventListener("submit", async eventoFormulario => {
  eventoFormulario.preventDefault();

  if (enviando || !disponivel) return;

  const evento = eventos.find(
    item => String(item.id) === String(selecionadoId)
  );

  if (!evento || situacao(evento) !== "Com vagas") {
    mensagem("Selecione um evento com vagas disponíveis.", "erro");
    return;
  }

  if (!el.form.reportValidity()) return;

  const nome = el.nome.value.trim();
  const email = el.email.value.trim().toLowerCase();

  if (nome.length < 3) {
    mensagem(
      "Informe um nome com pelo menos 3 caracteres.",
      "erro"
    );
    return;
  }

  enviando = true;
  el.botao.disabled = true;
  mensagem("Registrando inscrição...");

  try {
    const resposta = await fetch(
      `/api/eventos/${encodeURIComponent(evento.id)}/inscricoes`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify({
          participante: { nome, email }
        })
      }
    );

    const dados = await resposta.json().catch(() => ({}));

    if (!resposta.ok) {
      throw new Error(
        dados.mensagem || `Erro HTTP ${resposta.status}`
      );
    }

    mensagem(
      "Inscrição confirmada! Código de cancelamento: " +
      (dados.codigo_cancelamento || "não informado"),
      "sucesso"
    );

    el.form.reset();

    const id = evento.id;
    await carregarEventos();

    el.select.value = String(id);
    await consultarParticipantes();

  } catch (erro) {
    mensagem(
      erro.message || "Não foi possível concluir a inscrição.",
      "erro"
    );

  } finally {
    enviando = false;
    el.botao.disabled = true;
  }
});

el.busca.addEventListener("input", desenhar);
el.select.addEventListener("change", consultarParticipantes);

carregarEventos();
