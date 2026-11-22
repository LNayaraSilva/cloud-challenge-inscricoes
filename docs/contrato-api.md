# Contrato da API – Inscrições da Semana Acadêmica

## 1. Objetivo
Documentar a proposta inicial de comunicação entre frontend, backend Flask e banco PostgreSQL.

**Status:** Proposta para validação pela equipe.

## 2. Padrões
- Base da API: `/api`
- Formato de entrada e saída: JSON
- Datas: ISO 8601 com fuso horário
- Identificadores: números inteiros
- O servidor é responsável por gerar IDs, datas de criação e calcular vagas disponíveis.

## 3. Endpoints

| Método | Endpoint | Descrição | Acesso |
|---|---|---|---|
| GET | `/health` | Verificar se a aplicação está respondendo | Público |
| POST | `/api/eventos` | Cadastrar evento | **Comissão** (token) |
| GET | `/api/eventos` | Listar eventos e vagas | Público |
| GET | `/api/eventos/{id}` | Consultar evento | Público |
| POST | `/api/eventos/{id}/inscricoes` | Inscrever participante | Público |
| GET | `/api/eventos/{id}/inscricoes` | Listar inscrições do evento | Público (e-mail mascarado); comissão vê o e-mail completo |
| DELETE | `/api/inscricoes/{id}` | Cancelar inscrição | Quem se inscreveu (código de cancelamento) ou comissão |

### 3.1 Segurança das rotas

- **Token da comissão:** rotas da comissão exigem o cabeçalho `Authorization: Bearer <token>`. O token fica na variável de ambiente `COMISSAO_TOKEN` (nunca no código). Sem token ou com token errado: `401 NAO_AUTORIZADO`. Se o servidor estiver sem `COMISSAO_TOKEN` configurado, a rota fica bloqueada para todos: `503 SERVICO_INDISPONIVEL`.
- **Proteção contra IDOR no cancelamento:** a inscrição devolve um `codigo_cancelamento` (UUID) só para quem se inscreveu. Para cancelar, é preciso enviar esse código no cabeçalho `X-Codigo-Cancelamento`. Trocar o ID na URL sem o código certo devolve `404`, a mesma resposta de uma inscrição que não existe.
- **Privacidade:** a lista pública de inscritos mostra o e-mail mascarado (`m***@exemplo.com`) e nunca devolve o código de cancelamento.

## 4. Cadastro de evento

**POST `/api/eventos`**

Corpo da requisição:
```json
{
  "titulo": "Oficina de Python",
  "descricao": "Introdução à programação com Python",
  "palestrante": "Professor convidado",
  "local": "Laboratório 01",
  "data_inicio": "2026-11-10T19:00:00-03:00",
  "data_fim": "2026-11-10T21:00:00-03:00",
  "capacidade": 30
}
```

Cabeçalho obrigatório: `Authorization: Bearer <COMISSAO_TOKEN>`

Resposta esperada: `201 Created`, com o evento cadastrado e seu ID. Sem o token: `401`.

## 5. Listagem de eventos

**GET `/api/eventos`**

Resposta esperada: `200 OK`, com uma lista de eventos e o campo `vagas_disponiveis` calculado pelo servidor.

## 6. Inscrição em evento

**POST `/api/eventos/{id}/inscricoes`**

Corpo da requisição:
```json
{
  "participante": {
    "nome": "Maria Silva",
    "email": "maria@exemplo.com"
  }
}
```

Resposta esperada: `201 Created`, com o ID da inscrição, o ID do evento, o participante, o status `confirmada`, a data de criação e o `codigo_cancelamento`. **Guarde esse código:** ele só aparece nesta resposta e é necessário para cancelar.

## 7. Cancelamento

**DELETE `/api/inscricoes/{id}`**

Cabeçalho obrigatório (um dos dois):
- `X-Codigo-Cancelamento: <codigo_cancelamento recebido na inscrição>`; ou
- `Authorization: Bearer <COMISSAO_TOKEN>` (a comissão pode cancelar qualquer inscrição).

Resposta esperada: `204 No Content` quando o cancelamento for realizado com sucesso. Sem o código certo: `404 INSCRICAO_NAO_ENCONTRADA` (igual a uma inscrição inexistente).

## 8. Códigos HTTP

| Código | Significado |
|---|---|
| 200 | Consulta realizada com sucesso |
| 201 | Recurso criado com sucesso |
| 204 | Cancelamento realizado com sucesso |
| 400 | Dados inválidos |
| 401 | Rota da comissão sem token ou com token inválido |
| 404 | Evento ou inscrição não encontrado (ou cancelamento sem o código certo) |
| 409 | Conflito: inscrição duplicada ou vagas esgotadas |
| 422 | Regra de negócio não atendida, como inscrição em evento passado |
| 500 | Erro interno do servidor |
| 503 | Rota da comissão indisponível (`COMISSAO_TOKEN` não configurado no servidor) |

Exemplo de erro:
```json
{
  "erro": "VAGAS_ESGOTADAS",
  "mensagem": "Não existem vagas disponíveis para este evento."
}
```

## 9. Regras de negócio

1. Não permitir inscrições duplicadas para o mesmo evento e e-mail.
2. Não permitir inscrições em eventos que já começaram.
3. Não permitir inscrições quando não houver vagas.
4. O número de inscrições confirmadas não pode ultrapassar a capacidade do evento.
5. Quando duas pessoas disputarem a última vaga, apenas uma inscrição poderá ser confirmada; a outra deverá receber `409 Conflict`.
6. O cancelamento deve liberar a vaga anteriormente ocupada.
7. As regras devem ser validadas no backend e protegidas por transações e restrições adequadas no PostgreSQL.

## 10. Integração com a equipe

- **Anderson Bem (DEV):** validar e implementar as rotas no Django.
- **Laís Nayara (DEV):** utilizar os exemplos JSON na interface e integrar as requisições.
- **Wendel Brasiliano (DADOS):** alinhar o modelo relacional, integridade e transações.
- **Matheus Goes (QA):** elaborar cenários de testes com base neste contrato.
- **Lucas Mendes e Wendell Barboza (NUVEM):** apoiar as configurações de ambiente e implantação.

## 11. Observações

Este documento é uma proposta inicial e poderá ser ajustado após a validação da equipe. Os exemplos JSON são dados fictícios e não substituem a persistência em PostgreSQL. A implementação da API, autenticação, permissões e detalhes do cancelamento deverão ser definidos durante o desenvolvimento.
