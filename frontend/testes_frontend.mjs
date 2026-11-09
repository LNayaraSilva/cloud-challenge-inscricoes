import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';

const pasta = dirname(fileURLToPath(import.meta.url));

class Elemento {
    constructor(tag = 'div') {
        this.tag = tag;
        this.children = [];
        this.listeners = {};
        this.textContent = '';
        this.value = '';
        this.style = {};
        this.className = '';
        this.disabled = false;
        this.attributes = {};
    }
    appendChild(elemento) { this.children.push(elemento); return elemento; }
    replaceChildren(...elementos) { this.children = elementos; }
    addEventListener(tipo, funcao) { this.listeners[tipo] = funcao; }
    scrollIntoView() {}
    setAttribute(nome, valor) { this.attributes[nome] = valor; }
    removeAttribute(nome) { delete this.attributes[nome]; }
    reset() { for (const campo of ['nome', 'email']) this.document.elements[campo].value = ''; }
}

function criarDocumento(ids) {
    const elementos = Object.fromEntries(ids.map(id => [id, new Elemento()]));
    const documento = {
        elements: elementos,
        getElementById(id) { return elementos[id]; },
        createElement(tag) { return new Elemento(tag); }
    };
    for (const elemento of Object.values(elementos)) elemento.document = documento;
    return documento;
}

const json = (obj, status = 200) => ({ok: status < 400, status, json: async () => obj});
const esperar = () => new Promise(resolve => setTimeout(resolve, 5));

async function testarInscricaoReal() {
    const documento = criarDocumento([
        'lista-eventos','buscar-evento','form-inscricao','evento-selecionado',
        'mensagem-inscricao','btn-confirmar','inscricao','nome','email'
    ]);
    const chamadas = [];
    let inscricoes = 0;
    const evento = {
        id: 15, titulo: 'Evento do banco', descricao: 'Descrição real',
        palestrante: 'Professor', local: 'Auditório',
        data_inicio: '2099-01-01T09:00:00-03:00',
        data_fim: '2099-01-01T11:00:00-03:00',
        capacidade: 3
    };
    const buscar = async (url, options = {}) => {
        chamadas.push({url, options});
        if (url === '/api/eventos' && !options.method) {
            return json([{...evento, vagas_disponiveis: 3 - inscricoes}]);
        }
        if (url === '/api/eventos/15/inscricoes' && options.method === 'POST') {
            const dados = JSON.parse(options.body);
            assert.equal(dados.participante.nome, 'Maria Silva');
            assert.equal(dados.participante.email, 'maria@example.com');
            inscricoes++;
            return json({id: 1, status: 'confirmada'}, 201);
        }
        throw new Error('Requisição inesperada: ' + url);
    };
    runInNewContext(readFileSync(join(pasta, 'script.js'), 'utf8'), {
        document: documento, fetch: buscar, console, Date, Number,
        String, Boolean, Error, encodeURIComponent
    });
    await esperar();
    assert.equal(chamadas[0].url, '/api/eventos');
    const card = documento.elements['lista-eventos'].children[0];
    assert.equal(card.children[0].textContent, 'Evento do banco');
    card.children.at(-1).listeners.click();
    documento.elements.nome.value = 'Maria Silva';
    documento.elements.email.value = 'MARIA@example.com';
    await documento.elements['form-inscricao'].listeners.submit({preventDefault(){}});
    assert.equal(inscricoes, 1);
    assert.equal(documento.elements['mensagem-inscricao'].className, 'mensagem-sucesso');
    assert.equal(documento.elements['lista-eventos'].children[0].children.at(-2).textContent,
        'Vagas disponíveis: 2');
    assert.equal(documento.elements['btn-confirmar'].disabled, true);
}

async function testarListaPrivada() {
    const documento = criarDocumento([
        'selecionar-evento-org','buscar-inscrito','atualizar-inscritos',
        'status-organizacao','resumo-organizacao','corpo-inscritos'
    ]);
    const chamadas = [];
    const buscar = async url => {
        chamadas.push(url);
        if (url === '/api/eventos') return json([{id:9, titulo:'Oficina'}]);
        if (url === '/api/eventos/9/inscricoes') return json([{
            participante: {nome: 'João Teste', email: 'joao@example.com'},
            status: 'confirmada', criada_em: '2026-11-09T12:00:00-03:00'
        }]);
        throw new Error('API inesperada');
    };
    runInNewContext(readFileSync(join(pasta, 'organizacao.js'), 'utf8'), {
        document: documento, fetch: buscar, console, Date, Number,
        String, Array, Error, encodeURIComponent
    });
    await esperar();
    assert.deepEqual(chamadas, ['/api/eventos', '/api/eventos/9/inscricoes']);
    assert.equal(documento.elements['corpo-inscritos'].children[0].children[0].textContent,
        'João Teste');
    assert.equal(documento.elements['corpo-inscritos'].children[0].children[1].textContent,
        'joao@example.com');
}

await testarInscricaoReal();
await testarListaPrivada();
console.log('OK: listagem, cadastro real, atualização de vagas e painel de inscritos.');
