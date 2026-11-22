# Segurança das rotas

Duas proteções simples, sem login de usuário:

## 1. Token da comissão

Só a comissão organizadora pode **cadastrar eventos** e **ver o e-mail completo** dos inscritos. Para isso, ela envia um token no cabeçalho:

```
Authorization: Bearer <token da comissão>
```

- O token fica na variável de ambiente `COMISSAO_TOKEN` (no `.env` local e nas variáveis de ambiente do App Service). Nunca no código nem no GitHub.
- A comparação usa `hmac.compare_digest`, que leva o mesmo tempo dando certo ou errado, então não dá para descobrir o token pelo tempo de resposta.
- Sem token ou com token errado: `401 NAO_AUTORIZADO`.
- Se o servidor estiver sem `COMISSAO_TOKEN`, a rota fica **fechada para todos** (`503`). Esquecer de configurar não deixa a rota aberta.

## 2. Proteção contra IDOR no cancelamento

**IDOR** (*Insecure Direct Object Reference*) é trocar o ID na URL e mexer no que é de outra pessoa. Antes, qualquer um podia rodar `DELETE /api/inscricoes/1`, `/2`, `/3`... e cancelar a inscrição de todo mundo.

Agora:

1. Ao se inscrever, a pessoa recebe um `codigo_cancelamento` (UUID aleatório, impossível de adivinhar). Ele só aparece nessa resposta.
2. Para cancelar, ela envia o código no cabeçalho `X-Codigo-Cancelamento`.
3. Sem o código certo, a resposta é `404`, **a mesma** de uma inscrição que não existe: quem tenta adivinhar IDs não descobre nem se a inscrição existe.
4. A tentativa vai para o log como `IDOR bloqueado` (aparece no Log Stream do App Service).
5. A comissão (com o token) pode cancelar qualquer inscrição.

A lista pública de inscritos também passou a mascarar o e-mail (`maria@exemplo.com` vira `m***@exemplo.com`) e nunca devolve o código de cancelamento.

## Onde está no código

| O quê | Arquivo |
|---|---|
| Regras (token, código, máscara de e-mail) | `backend/api/seguranca.py` |
| Uso nas rotas | `backend/api/views.py` |
| Campo `codigo_cancelamento` | `backend/api/models.py` e migração `0002_inscricao_codigo_cancelamento.py` |
| Leitura do `COMISSAO_TOKEN` e cabeçalho liberado no CORS | `backend/config/settings.py` |
| Testes automatizados | `backend/api/tests.py` (classe `SegurancaDasRotasTests`) |

## Como testar

Automático:

```bash
cd backend
python manage.py test
```

Manual: use [exemplos/seguranca.http](exemplos/seguranca.http) (extensão REST Client do VS Code) ou os mesmos passos no Postman.

| Teste | Esperado |
|---|---|
| Cadastrar evento sem token | 401 |
| Cadastrar evento com token | 201 |
| Inscrever (público) | 201 com `codigo_cancelamento` |
| Cancelar a inscrição de outra pessoa sem código, ou com o código de outra inscrição | 404 |
| Cancelar com o próprio código | 204 |
| Listar inscritos sem token | e-mail mascarado |
| Listar inscritos com token | e-mail completo |

## Limitações (conscientes)

- O token é único e compartilhado pela comissão. Se vazar, basta trocar o `COMISSAO_TOKEN` no App Service e reiniciar.
- Não há limite de tentativas (*rate limit*). O UUID tem 122 bits aleatórios, então adivinhar um código por força bruta não é viável na prática.
- O frontend atual usa dados simulados; quando for integrado, deve guardar o `codigo_cancelamento` (por exemplo, mostrando-o para a pessoa após a inscrição) e enviá-lo no cancelamento.
