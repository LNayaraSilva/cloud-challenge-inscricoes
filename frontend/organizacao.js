/* Área restrita: o backend exige login de colaborador para este HTML e para a API. */
const seletor = document.getElementById('selecionar-evento-org');
const busca = document.getElementById('buscar-inscrito');
const atualizar = document.getElementById('atualizar-inscritos');
const status = document.getElementById('status-organizacao');
const resumo = document.getElementById('resumo-organizacao');
const corpo = document.getElementById('corpo-inscritos');
let inscritos = [];
let carregamentoId = 0;

function textoStatus(texto, erro = false) {
    status.textContent = texto;
    status.className = erro ? 'erro' : '';
}

function formatarDataInscricao(valor) {
    const data = new Date(valor);
    return Number.isNaN(data.getTime()) ? '—' : data.toLocaleString('pt-BR', {
        dateStyle: 'short', timeStyle: 'short'
    });
}

async function consultarJson(url) {
    const resposta = await fetch(url, {credentials: 'same-origin', cache: 'no-store'});
    if (resposta.status === 401 || resposta.status === 403) {
        throw new Error('Acesso não autorizado. Entre novamente na área administrativa.');
    }
    if (!resposta.ok) throw new Error(`Falha ao consultar a API (HTTP ${resposta.status}).`);
    return resposta.json();
}

function linhaVazia(mensagem) {
    const linha = document.createElement('tr');
    const celula = document.createElement('td');
    celula.colSpan = 4;
    celula.textContent = mensagem;
    linha.appendChild(celula);
    corpo.appendChild(linha);
}

function mostrarInscritos() {
    corpo.replaceChildren();
    const termo = busca.value.trim().toLocaleLowerCase('pt-BR');
    const encontrados = inscritos.filter(inscricao =>
        String(inscricao.participante?.nome || '').toLocaleLowerCase('pt-BR').includes(termo) ||
        String(inscricao.participante?.email || '').toLocaleLowerCase('pt-BR').includes(termo)
    );

    resumo.textContent = `${inscritos.length} inscrição(ões) no evento. ${encontrados.length} exibida(s).`;
    if (!encontrados.length) {
        linhaVazia(termo ? 'Nenhum participante corresponde à busca.' : 'Ainda não há inscrições neste evento.');
        return;
    }

    encontrados.forEach(inscricao => {
        const linha = document.createElement('tr');
        [
            inscricao.participante?.nome || '—',
            inscricao.participante?.email || '—',
            inscricao.status || '—',
            formatarDataInscricao(inscricao.criada_em)
        ].forEach(valor => {
            const celula = document.createElement('td');
            celula.textContent = valor;  // Nunca usar innerHTML com dados de usuários.
            linha.appendChild(celula);
        });
        corpo.appendChild(linha);
    });
}

async function carregarInscricoes() {
    const idDaConsulta = ++carregamentoId;
    const id = seletor.value;
    inscritos = [];
    corpo.replaceChildren();
    resumo.textContent = 'Consultando inscritos...';
    if (!id) {
        linhaVazia('Selecione um evento acima.');
        textoStatus('Selecione um evento para consultar.');
        return;
    }

    atualizar.disabled = true;
    textoStatus('Carregando inscrições...');
    try {
        const resposta = await consultarJson(`/api/eventos/${encodeURIComponent(id)}/inscricoes`);
        if (idDaConsulta !== carregamentoId) return;
        if (!Array.isArray(resposta)) throw new Error('Formato inesperado na API.');
        inscritos = resposta;
        mostrarInscritos();
        textoStatus('Lista atualizada.');
    } catch (erro) {
        if (idDaConsulta !== carregamentoId) return;
        resumo.textContent = 'Não foi possível consultar os participantes.';
        corpo.replaceChildren();
        linhaVazia('Não foi possível consultar os participantes.');
        textoStatus(erro.message, true);
    } finally {
        if (idDaConsulta === carregamentoId) atualizar.disabled = false;
    }
}

async function inicializarOrganizacao() {
    try {
        const eventos = await consultarJson('/api/eventos');
        if (!Array.isArray(eventos)) throw new Error('Formato inesperado da lista de eventos.');
        seletor.replaceChildren();
        if (!eventos.length) {
            const option = document.createElement('option');
            option.textContent = 'Nenhum evento cadastrado';
            option.value = '';
            seletor.appendChild(option);
            textoStatus('Cadastre um evento no painel administrativo para iniciar.');
            corpo.replaceChildren();
            linhaVazia('Nenhum evento cadastrado.');
            return;
        }
        eventos.forEach(evento => {
            const option = document.createElement('option');
            option.value = evento.id;
            option.textContent = evento.titulo;
            seletor.appendChild(option);
        });
        seletor.value = String(eventos[0].id);
        await carregarInscricoes();
    } catch (erro) {
        seletor.replaceChildren();
        textoStatus(erro.message, true);
        corpo.replaceChildren();
        linhaVazia('Não foi possível carregar os eventos.');
    }
}

seletor.addEventListener('change', carregarInscricoes);
atualizar.addEventListener('click', carregarInscricoes);
busca.addEventListener('input', mostrarInscritos);
inicializarOrganizacao();
