/*
 * Semana Acadêmica — frontend
 * API real: GET /api/eventos e POST /api/eventos/{id}/inscricoes
 * Se a API estiver indisponível, mostramos dados ilustrativos SEM aceitar inscrições.
 */
"use strict";

const eventosDemonstracao = [
  {
    id: 1,
    titulo: "Oficina de Python",
    descricao: "Aprenda os fundamentos da programação e dê seus primeiros passos com código.",
    palestrante: "Equipe acadêmica",
    local: "Laboratório 01",
    data_inicio: "2026-11-10T19:00:00-03:00",
    capacidade: 30,
    vagas_disponiveis: 30
  },
  {
    id: 2,
    titulo: "Introdução à Inteligência Artificial",
    descricao: "Descubra aplicações e conceitos essenciais da inteligência artificial.",
    palestrante: "Equipe acadêmica",
    local: "Auditório",
    data_inicio: "2026-11-11T19:00:00-03:00",
    capacidade: 40,
    vagas_disponiveis: 15
  },
  {
    id: 3,
    titulo: "Segurança da Informação",
    descricao: "Explore boas práticas para proteger dados e sistemas digitais.",
    palestrante: "Equipe acadêmica",
    local: "Sala 05",
    data_inicio: "2026-11-12T19:00:00-03:00",
    capacidade: 25,
    vagas_disponiveis: 0
  }
];

const elementos = {
  lista: document.getElementById("lista-eventos"),
  busca: document.getElementById("buscar-evento"),
  filtro: document.getElementById("filtro-eventos"),
  atualizar: document.getElementById("recarregar-eventos"),
  aviso: document.getElementById("aviso-api"),
  total: document.getElementById("numero-eventos"),
  disponiveis: document.getElementById("numero-disponiveis"),
  contagem: document.getElementById("contador-exibidos"),
  formulario: document.getElementById("form-inscricao"),
  tituloSelecionado: document.getElementById("evento-selecionado"),
  dataSelecionada: document.getElementById("evento-selecionado-data"),
  nome: document.getElementById("nome"),
  email: document.getElementById("email"),
  botaoConfirmar: document.getElementById("btn-confirmar"),
  mensagem: document.getElementById("mensagem-inscricao")
};

const estado = {
  eventos: [],
  modo: "carregando", // real, demonstracao ou carregando
  idSelecionado: null,
  enviando: false
};

function normalizarTexto(texto) {
  return String(texto ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function dataValida(valor) {
  const data = new Date(valor);
  return !Number.isNaN(data.getTime());
}

function formatarData(valor) {
  if (!dataValida(valor)) return "Data a confirmar";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", timeZone: "America/Recife"
  }).format(new Date(valor));
}

function statusEvento(evento) {
  if (!dataValida(evento.data_inicio) || new Date(evento.data_inicio) <= new Date()) {
    return { codigo: "encerrado", texto: "Encerrado" };
  }
  if (evento.vagas_disponiveis <= 0) {
    return { codigo: "lotado", texto: "Esgotado" };
  }
  return { codigo: "disponivel", texto: "Com vagas" };
}

function normalizarEvento(evento) {
  return {
    id: evento.id,
    titulo: String(evento.titulo || "Evento sem título"),
    descricao: String(evento.descricao || "Detalhes em breve."),
    palestrante: String(evento.palestrante || "A confirmar"),
    local: String(evento.local || "A confirmar"),
    data_inicio: evento.data_inicio,
    capacidade: Number(evento.capacidade || 0),
    vagas_disponiveis: Math.max(0, Number(evento.vagas_disponiveis || 0))
  };
}

function mostrarMensagem(texto, tipo = "info") {
  elementos.mensagem.textContent = texto;
  elementos.mensagem.className = `mensagem-inscricao ${tipo}`;
  elementos.mensagem.setAttribute("role", tipo === "erro" ? "alert" : "status");
}

function mostrarAviso(texto, tipo = "aviso") {
  elementos.aviso.textContent = texto;
  elementos.aviso.className = tipo === "sucesso" ? "aviso-api sucesso" : "aviso-api";
  elementos.aviso.hidden = !texto;
}

function limparSelecao() {
  estado.idSelecionado = null;
  atualizarSelecao();
}

function atualizarSelecao() {
  const evento = estado.eventos.find(item => String(item.id) === String(estado.idSelecionado));
  if (!evento) {
    elementos.tituloSelecionado.textContent = "Nenhum evento selecionado";
    elementos.dataSelecionada.textContent = "Selecione um card da programação";
    elementos.botaoConfirmar.textContent = "Selecione um evento →";
    elementos.botaoConfirmar.disabled = true;
    return;
  }

  elementos.tituloSelecionado.textContent = evento.titulo;
  elementos.dataSelecionada.textContent = `${formatarData(evento.data_inicio)} · ${evento.local}`;

  if (estado.modo !== "real") {
    elementos.botaoConfirmar.textContent = "Inscrições indisponíveis";
    elementos.botaoConfirmar.disabled = true;
  } else if (statusEvento(evento).codigo !== "disponivel") {
    elementos.botaoConfirmar.textContent = "Inscrições encerradas";
    elementos.botaoConfirmar.disabled = true;
  } else {
    elementos.botaoConfirmar.textContent = estado.enviando ? "Enviando inscrição..." : "Confirmar inscrição →";
    elementos.botaoConfirmar.disabled = estado.enviando;
  }
}

function selecionarEvento(id) {
  const evento = estado.eventos.find(item => String(item.id) === String(id));
  if (!evento) return;
  estado.idSelecionado = id;
  atualizarSelecao();
  mostrarMensagem(estado.modo === "real" ? "Preencha seus dados para concluir a inscrição." : "Esta é uma programação ilustrativa. Inscrições reais estão indisponíveis enquanto a API não responder.", "info");
  mostrarEventos();
  document.getElementById("inscricao").scrollIntoView({ behavior: "smooth", block: "start" });
}

function criarElemento(tag, classe, texto) {
  const elemento = document.createElement(tag);
  if (classe) elemento.className = classe;
  if (texto !== undefined) elemento.textContent = texto;
  return elemento;
}

function criarCard(evento) {
  const situacao = statusEvento(evento);
  const card = criarElemento("article", "card-evento");
  if (String(evento.id) === String(estado.idSelecionado)) card.classList.add("selecionado");

  const topo = criarElemento("div", "card-cabecalho");
  topo.appendChild(criarElemento("span", "card-icone", "✦"));
  topo.appendChild(criarElemento("span", `card-situacao ${situacao.codigo}`, situacao.texto));
  card.appendChild(topo);
  card.appendChild(criarElemento("h4", "", evento.titulo));
  card.appendChild(criarElemento("p", "card-descricao", evento.descricao));

  const metadados = criarElemento("div", "card-meta");
  metadados.appendChild(criarElemento("span", "", `📅  ${formatarData(evento.data_inicio)}`));
  metadados.appendChild(criarElemento("span", "", `📍  ${evento.local}`));
  if (evento.palestrante && evento.palestrante !== "A confirmar") {
    metadados.appendChild(criarElemento("span", "", `🎤  ${evento.palestrante}`));
  }
  card.appendChild(metadados);
  card.appendChild(criarElemento("div", "card-vagas", `${evento.vagas_disponiveis} de ${evento.capacidade} vagas disponíveis`));

  const botao = criarElemento("button", "card-botao", estado.modo === "real" ? "Quero me inscrever →" : "Ver detalhes (demonstração) →");
  botao.type = "button";
  if (estado.modo !== "real") botao.classList.add("demo");
  if (estado.modo === "real" && situacao.codigo !== "disponivel") {
    botao.textContent = "Inscrições indisponíveis";
    botao.disabled = true;
  }
  botao.addEventListener("click", () => selecionarEvento(evento.id));
  card.appendChild(botao);
  return card;
}

function mostrarEventos() {
  const busca = normalizarTexto(elementos.busca.value.trim());
  const filtro = elementos.filtro.value;
  const filtrados = estado.eventos.filter(evento => {
    const conteudo = normalizarTexto(`${evento.titulo} ${evento.descricao} ${evento.local} ${evento.palestrante}`);
    const condicaoBusca = conteudo.includes(busca);
    const disponivel = statusEvento(evento).codigo === "disponivel";
    return condicaoBusca && (filtro === "todos" || (filtro === "disponiveis" ? disponivel : !disponivel));
  });

  elementos.lista.replaceChildren();
  elementos.lista.setAttribute("aria-busy", "false");
  elementos.contagem.textContent = `${filtrados.length} ${filtrados.length === 1 ? "evento encontrado" : "eventos encontrados"}`;
  elementos.total.textContent = String(estado.eventos.length);
  elementos.disponiveis.textContent = String(estado.eventos.filter(item => statusEvento(item).codigo === "disponivel").length);

  if (!filtrados.length) {
    const vazio = criarElemento("div", "estado-vazio");
    vazio.appendChild(criarElemento("strong", "", estado.eventos.length ? "Nenhum evento corresponde à busca." : "Nenhum evento cadastrado no momento."));
    vazio.appendChild(criarElemento("p", "", estado.eventos.length ? "Tente outro termo ou altere o filtro." : "Volte depois para consultar a programação."));
    elementos.lista.appendChild(vazio);
    return;
  }
  const fragmento = document.createDocumentFragment();
  filtrados.forEach(evento => fragmento.appendChild(criarCard(evento)));
  elementos.lista.appendChild(fragmento);
}

async function carregarEventos() {
  elementos.atualizar.disabled = true;
  elementos.lista.setAttribute("aria-busy", "true");
  elementos.contagem.textContent = "Buscando eventos...";
  const controlador = new AbortController();
  const limite = setTimeout(() => controlador.abort(), 10000);

  try {
    const resposta = await fetch("/api/eventos", {
      method: "GET", headers: { Accept: "application/json" },
      cache: "no-store", signal: controlador.signal
    });
    if (!resposta.ok) throw new Error(`A API retornou HTTP ${resposta.status}`);
    const dados = await resposta.json();
    if (!Array.isArray(dados)) throw new Error("Formato inesperado na lista de eventos");

    estado.modo = "real";
    estado.eventos = dados.map(normalizarEvento).sort((a, b) => new Date(a.data_inicio) - new Date(b.data_inicio));
    mostrarAviso("");
  } catch (erro) {
    console.warn("API indisponível. Exibindo programação ilustrativa:", erro.message);
    estado.modo = "demonstracao";
    estado.eventos = eventosDemonstracao.map(normalizarEvento);
    mostrarAviso("Modo demonstração: a API de eventos está indisponível. Os eventos e as vagas abaixo são ilustrativos; nenhuma inscrição pode ser realizada neste momento.");
  } finally {
    clearTimeout(limite);
    elementos.atualizar.disabled = false;
    limparSelecao();
    mostrarEventos();
  }
}

async function enviarInscricao(evento) {
  const resposta = await fetch(`/api/eventos/${encodeURIComponent(evento.id)}/inscricoes`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ participante: { nome: elementos.nome.value.trim(), email: elementos.email.value.trim().toLowerCase() } })
  });
  const dados = await resposta.json().catch(() => ({}));
  if (!resposta.ok) {
    throw new Error(dados.mensagem || `Não foi possível concluir a inscrição (HTTP ${resposta.status}).`);
  }
  return dados;
}

async function processarFormulario(evento) {
  evento.preventDefault();
  if (estado.enviando) return;

  if (estado.modo !== "real") {
    mostrarMensagem("Inscrições indisponíveis enquanto o banco de dados não responder.", "erro");
    return;
  }

  const escolhido = estado.eventos.find(item => String(item.id) === String(estado.idSelecionado));
  if (!escolhido) { mostrarMensagem("Selecione um evento para continuar.", "erro"); return; }
  if (statusEvento(escolhido).codigo !== "disponivel") { mostrarMensagem("Este evento não está aceitando inscrições.", "erro"); return; }

  const nome = elementos.nome.value.trim();
  if (nome.length < 3) { mostrarMensagem("Informe seu nome completo (pelo menos 3 caracteres).", "erro"); elementos.nome.focus(); return; }
  if (!elementos.email.validity.valid || !elementos.email.value.trim()) { mostrarMensagem("Informe um endereço de e-mail válido.", "erro"); elementos.email.focus(); return; }

  estado.enviando = true;
  atualizarSelecao();
  mostrarMensagem("Enviando sua inscrição...", "info");
  try {
    await enviarInscricao(escolhido);
    escolhido.vagas_disponiveis = Math.max(0, escolhido.vagas_disponiveis - 1);
    elementos.formulario.reset();
    limparSelecao();
    mostrarEventos();
    mostrarMensagem("Inscrição confirmada e registrada no sistema! Confira os dados informados e guarde esta confirmação.", "sucesso");
  } catch (erro) {
    mostrarMensagem(erro.message || "Não foi possível concluir a inscrição. Tente novamente.", "erro");
  } finally {
    estado.enviando = false;
    atualizarSelecao();
  }
}

elementos.busca.addEventListener("input", mostrarEventos);
elementos.filtro.addEventListener("change", mostrarEventos);
elementos.atualizar.addEventListener("click", carregarEventos);
elementos.formulario.addEventListener("submit", processarFormulario);
carregarEventos();
