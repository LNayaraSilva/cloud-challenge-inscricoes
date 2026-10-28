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

| Método | Endpoint | Descrição |
|---|---|---|
| GET | `/health` | Verificar se a aplicação está respondendo |
| POST | `/api/eventos` | Cadastrar evento |
| GET | `/api/eventos` | Listar eventos e vagas |
| GET | `/api/eventos/{id}` | Consultar evento |
| POST | `/api/eventos/{id}/inscricoes` | Inscrever participante |
| GET | `/api/eventos/{id}/inscricoes` | Listar inscrições do evento |
| DELETE | `/api/inscricoes/{id}` | Cancelar inscrição |

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

Resposta esperada: `201 Created`, com o evento cadastrado e seu ID.

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

Resposta esperada: `201 Created`, com o ID da inscrição, o ID do evento, o participante, o status `confirmada` e a data de criação.

## 7. Cancelamento

**DELETE `/api/inscricoes/{id}`**

Resposta esperada: `204 No Content` quando o cancelamento for realizado com sucesso.

## 8. Códigos HTTP

| Código | Significado |
|---|---|
| 200 | Consulta realizada com sucesso |
| 201 | Recurso criado com sucesso |
| 204 | Cancelamento realizado com sucesso |
| 400 | Dados inválidos |
| 404 | Evento ou inscrição não encontrado |
| 409 | Conflito: inscrição duplicada ou vagas esgotadas |
| 422 | Regra de negócio não atendida, como inscrição em evento passado |
| 500 | Erro interno do servidor |

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
