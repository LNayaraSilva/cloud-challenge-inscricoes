-- =========================================================
-- Sistema de Inscrições da Semana Acadêmica
-- Exemplos de utilização do banco de dados PostgreSQL
-- =========================================================
--
-- Este arquivo contém exemplos de cadastro e consulta.
-- Execute primeiro o arquivo banco/schema.sql.
--
-- Atenção:
-- Os comandos INSERT adicionam dados ao banco.
-- =========================================================


-- =========================================================
-- 1. CADASTRAR EVENTOS
-- =========================================================

INSERT INTO api_evento (
    titulo,
    descricao,
    palestrante,
    local,
    data_inicio,
    data_fim,
    capacidade
)
VALUES (
    'Introdução ao PostgreSQL',
    'Palestra introdutória sobre bancos de dados relacionais e PostgreSQL.',
    'Equipe da Semana Acadêmica',
    'Auditório principal',
    '2026-11-25 19:00:00-03',
    '2026-11-25 21:00:00-03',
    2
);

INSERT INTO api_evento (
    titulo,
    descricao,
    palestrante,
    local,
    data_inicio,
    data_fim,
    capacidade
)
VALUES (
    'Desenvolvimento Web com Django',
    'Oficina sobre desenvolvimento de aplicações web utilizando Django.',
    'Equipe de Desenvolvimento',
    'Laboratório 01',
    '2026-11-26 18:30:00-03',
    '2026-11-26 21:30:00-03',
    20
);


-- =========================================================
-- 2. CONSULTAR TODOS OS EVENTOS
-- =========================================================

SELECT
    id,
    titulo,
    palestrante,
    local,
    data_inicio,
    data_fim,
    capacidade,
    criado_em
FROM api_evento
ORDER BY data_inicio;


-- =========================================================
-- 3. CONSULTAR UM EVENTO PELO TÍTULO
-- =========================================================

SELECT
    id,
    titulo,
    descricao,
    palestrante,
    local,
    data_inicio,
    data_fim,
    capacidade
FROM api_evento
WHERE titulo = 'Introdução ao PostgreSQL';


-- =========================================================
-- 4. CADASTRAR PARTICIPANTES EM UM EVENTO
-- =========================================================

INSERT INTO api_inscricao (
    participante_nome,
    participante_email,
    status,
    evento_id
)
VALUES (
    'Participante Um',
    'participante1@email.com',
    'confirmada',
    (
        SELECT id
        FROM api_evento
        WHERE titulo = 'Introdução ao PostgreSQL'
        ORDER BY id DESC
        LIMIT 1
    )
);

INSERT INTO api_inscricao (
    participante_nome,
    participante_email,
    status,
    evento_id
)
VALUES (
    'Participante Dois',
    'participante2@email.com',
    'confirmada',
    (
        SELECT id
        FROM api_evento
        WHERE titulo = 'Introdução ao PostgreSQL'
        ORDER BY id DESC
        LIMIT 1
    )
);


-- =========================================================
-- 5. CONSULTAR INSCRIÇÕES COM OS DADOS DO EVENTO
-- =========================================================

SELECT
    i.id AS inscricao_id,
    i.participante_nome,
    i.participante_email,
    i.status,
    i.criada_em,
    e.id AS evento_id,
    e.titulo AS evento,
    e.local,
    e.data_inicio
FROM api_inscricao AS i
INNER JOIN api_evento AS e
    ON e.id = i.evento_id
ORDER BY e.data_inicio, i.participante_nome;


-- =========================================================
-- 6. CONTAR INSCRIÇÕES E CALCULAR VAGAS DISPONÍVEIS
-- =========================================================

SELECT
    e.id,
    e.titulo,
    e.capacidade,
    COUNT(i.id) FILTER (
        WHERE i.status = 'confirmada'
    ) AS inscricoes_confirmadas,
    e.capacidade - COUNT(i.id) FILTER (
        WHERE i.status = 'confirmada'
    ) AS vagas_disponiveis
FROM api_evento AS e
LEFT JOIN api_inscricao AS i
    ON i.evento_id = e.id
GROUP BY
    e.id,
    e.titulo,
    e.capacidade
ORDER BY e.data_inicio;


-- =========================================================
-- 7. LISTAR APENAS EVENTOS COM VAGAS DISPONÍVEIS
-- =========================================================

SELECT
    e.id,
    e.titulo,
    e.local,
    e.data_inicio,
    e.capacidade,
    COUNT(i.id) FILTER (
        WHERE i.status = 'confirmada'
    ) AS inscricoes_confirmadas,
    e.capacidade - COUNT(i.id) FILTER (
        WHERE i.status = 'confirmada'
    ) AS vagas_disponiveis
FROM api_evento AS e
LEFT JOIN api_inscricao AS i
    ON i.evento_id = e.id
GROUP BY
    e.id,
    e.titulo,
    e.local,
    e.data_inicio,
    e.capacidade
HAVING COUNT(i.id) FILTER (
    WHERE i.status = 'confirmada'
) < e.capacidade
ORDER BY e.data_inicio;


-- =========================================================
-- 8. CONSULTAR AS INSCRIÇÕES DE UM EVENTO
-- =========================================================

SELECT
    i.id,
    i.participante_nome,
    i.participante_email,
    i.status,
    i.criada_em
FROM api_inscricao AS i
INNER JOIN api_evento AS e
    ON e.id = i.evento_id
WHERE e.titulo = 'Introdução ao PostgreSQL'
ORDER BY i.participante_nome;


-- =========================================================
-- 9. CONSULTAR UMA INSCRIÇÃO PELO E-MAIL
-- =========================================================

SELECT
    i.id,
    i.participante_nome,
    i.participante_email,
    i.status,
    e.titulo AS evento,
    e.data_inicio
FROM api_inscricao AS i
INNER JOIN api_evento AS e
    ON e.id = i.evento_id
WHERE i.participante_email = 'participante1@email.com'
ORDER BY e.data_inicio;


-- =========================================================
-- 10. OBSERVAÇÕES SOBRE AS REGRAS DO BANCO
-- =========================================================
--
-- O banco impede automaticamente:
--
-- 1. Capacidade igual ou inferior a zero;
-- 2. Data final anterior ou igual à data inicial;
-- 3. Inscrição associada a um evento inexistente;
-- 4. Utilização do mesmo e-mail duas vezes no mesmo evento;
-- 5. Inscrição acima da capacidade máxima do evento.
--
-- Exemplos que provocam erros intencionalmente não são executados
-- neste arquivo, para que os comandos de cadastro e consulta possam
-- ser utilizados sem interromper a execução.
-- =========================================================
