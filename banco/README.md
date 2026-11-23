# Banco de dados

Esta pasta contém os arquivos relacionados ao banco de dados do Sistema de Inscrições da Semana Acadêmica.

O projeto utiliza PostgreSQL no ambiente de produção e Django no back-end.

## Arquivos

- `schema.sql`: contém a estrutura das tabelas, chaves, restrições, índices e controle do limite de vagas;
- `exemplos.sql`: contém exemplos de cadastro e consulta para auxiliar na utilização do banco.

## Estrutura do banco

O banco possui duas tabelas principais:

- `api_evento`: armazena os eventos acadêmicos;
- `api_inscricao`: armazena as inscrições dos participantes.

## Tabela `api_evento`

A tabela de eventos possui os seguintes campos:

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | BIGINT | Identificador único do evento |
| `titulo` | VARCHAR(200) | Título do evento |
| `descricao` | TEXT | Descrição do evento |
| `palestrante` | VARCHAR(200) | Nome do palestrante |
| `local` | VARCHAR(200) | Local de realização |
| `data_inicio` | TIMESTAMP | Data e horário de início |
| `data_fim` | TIMESTAMP | Data e horário de encerramento |
| `capacidade` | INTEGER | Quantidade máxima de participantes |
| `criado_em` | TIMESTAMP | Data e horário de criação |

## Tabela `api_inscricao`

A tabela de inscrições possui os seguintes campos:

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | BIGINT | Identificador único da inscrição |
| `participante_nome` | VARCHAR(200) | Nome do participante |
| `participante_email` | VARCHAR(254) | E-mail do participante |
| `status` | VARCHAR(20) | Situação da inscrição |
| `criada_em` | TIMESTAMP | Data e horário da inscrição |
| `evento_id` | BIGINT | Identificador do evento escolhido |

## Relacionamento

O relacionamento entre eventos e inscrições é de um para muitos.

Um evento pode possuir várias inscrições, mas cada inscrição pertence a somente um evento.

O campo `evento_id`, presente em `api_inscricao`, é uma chave estrangeira que referencia o campo `id` da tabela `api_evento`.

A exclusão utiliza `ON DELETE CASCADE`. Dessa forma, quando um evento é excluído, suas inscrições também são removidas.

## Regras de integridade

O banco implementa as seguintes regras:

- a capacidade do evento deve ser maior que zero;
- a data de encerramento deve ser posterior à data de início;
- cada inscrição deve estar vinculada a um evento existente;
- o mesmo e-mail não pode ser inscrito duas vezes no mesmo evento;
- o status da inscrição deve possuir um valor permitido;
- não é possível ultrapassar a capacidade máxima do evento.

## Prevenção de inscrições duplicadas

A restrição única formada por `evento_id` e `participante_email` impede que o mesmo e-mail seja cadastrado duas vezes no mesmo evento.

O participante pode utilizar o mesmo e-mail em eventos diferentes.

## Controle do limite de vagas

A função `verificar_capacidade_evento()` conta as inscrições confirmadas antes de permitir uma nova inscrição.

A trigger `trg_verificar_capacidade_evento` executa essa verificação antes de uma inclusão ou atualização.

Quando a quantidade de inscrições confirmadas atinge a capacidade do evento, a nova inscrição é bloqueada.

## Execução do esquema

> Atenção: o arquivo `schema.sql` remove as tabelas existentes antes de recriá-las. Não execute esse arquivo em um banco com dados importantes sem realizar um backup.

Para criar a estrutura em um banco PostgreSQL usando o terminal:

```bash
psql -U USUARIO -d NOME_DO_BANCO -f banco/schema.sql
