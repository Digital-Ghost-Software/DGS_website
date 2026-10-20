# RF-007 — APIs cadastradas e documentação OpenAPI (Swagger)

> **Natureza:** protótipo acadêmico. A API é servida na mesma origem do site (Vercel) e usa Supabase (Auth + PostgreSQL) e Stripe Checkout em **modo de teste**. Não há cobrança real e nenhum dado financeiro é persistido.

## 1. Metadados do requisito

| Campo | Valor |
| --- | --- |
| ID | RF-007 |
| Título | Registrar, expor e documentar as APIs do site Yokai Tales (CRUD das notas de atualização + rotas de apoio) |
| Tipo | Requisito funcional |
| Prioridade | Alta — a documentação OpenAPI é obrigatória na entrega do Tópico 4 |
| Complexidade | Média (5 story points) |
| Status | Rotas implementadas e documentadas; validação final no deploy publicado pendente (ver seção 10) |
| Atualização | 20/10/2026 |
| Projeto | Digital Ghost Software — Yokai Tales |
| Contrato OpenAPI | [Docs/api/swagger.json](api/swagger.json) (principal) e [Docs/api/openapi.yaml](api/openapi.yaml) (contrato anterior do RF-004) |

### 1.1 Links de entrega (Tópico 1)

| Item | Descrição | Link |
| --- | --- | --- |
| a (obrigatório) | URL pública da aplicação | https://dgs-website-omega.vercel.app/ |
| b (obrigatório) | Banco de dados online (Supabase, projeto `DGS_Web_Site`) | https://supabase.com/dashboard/project/thmtriwgvsgxdinsuxph |
| c (obrigatório) | Repositório GitHub (branch `main`) | https://github.com/Digital-Ghost-Software/DGS_website |
| Opcional | Swagger UI publicada | Não publicada. Abrir `Docs/api/swagger.json` em https://editor.swagger.io |

### 1.2 Equipe

| Integrante | Papel registrado nas entregas | Contato registrado |
| --- | --- | --- |
| Andre Luis Macedo Nascimento | Back-end | <andre58212086@edu.df.senac.br> |
| Calebe Bezerra Feitosa | Marketing | <calebe58107886@edu.df.senac.br> |
| Douglas Rocha Vasco | Back-end / Modelagem | <douglas58129016@edu.df.senac.br> |
| Jonas Santos Barbosa | História / Marketing | <jonas59300436@edu.df.senac.br> |
| Letícia Lacerda Domingues | Dubladora | <leticia49518826@edu.df.senac.br> |
| Pedro Henrique Coelho Lima | Marketing | <pedro57951426@edu.df.senac.br> |
| Raphael Alves Mendes | Marketing / Modelagem | <raphael59068396@edu.df.senac.br> |
| Tiago de Andrade Lima | Full-stack | <tiago59068726@edu.df.senac.br> |

### 1.3 Estrutura de diretórios (artefatos deste requisito)

```text
DGS_website/
├── .gitignore                       # ignora .env, .env.*, node_modules/ e dist/
├── README.md
├── vercel.json
├── api/                             # funções serverless da Vercel
│   ├── [...path].js                 # encaminha /api/* para server/index.js
│   ├── catarse/yokai-tales.js
│   └── stripe/webhook.js
├── server/
│   ├── index.js                     # roteador principal e rotas de apoio
│   ├── local.js                     # servidor HTTP de desenvolvimento
│   └── routes/updates.js            # CRUD /api/updates
├── database/ddl/
│   ├── new-project-schema.sql       # profiles, admin, simulated_payments, game_downloads
│   ├── feedback-comments.sql        # cria public.is_feedback_admin()
│   └── supabase_atualizacoes.sql    # tabela public.game_updates (DDL do CRUD)
├── Docs/
│   ├── RF-007-APIs.md               # ESTE ARQUIVO
│   └── api/
│       ├── swagger.json             # OpenAPI 3.0.3 (obrigatório)
│       └── openapi.yaml             # contrato anterior (RF-004)
├── js/ css/ paginas/ index.html     # interface (notas de atualização em paginas/tales.html)
└── tests/                           # unit/updates-api.test.js e integration/api.test.js
```

## 2. Descrição e atores

### 2.1 Descrição

O servidor Node.js (`server/index.js`) registra um conjunto de rotas sob `/api`. O **CRUD completo** do requisito é o recurso **notas de atualização** (`/api/updates`), que alimenta a página de novidades do jogo: qualquer visitante lê; somente administradores criam, editam e excluem. As demais rotas dão suporte a perfil, pedidos de teste, downloads, conta, integração com o Catarse e configuração pública.

O arquivo `Docs/api/swagger.json` descreve **todas** as rotas registradas, com método, parâmetros, corpo, códigos de resposta, segurança `BearerAuth` e exemplos.

### 2.2 Atores e permissões no CRUD de `/api/updates`

| Ator | Papel | CREATE | READ | UPDATE | DELETE |
| --- | --- | :---: | :---: | :---: | :---: |
| Visitante (sem login) | Consulta as notas publicadas | ❌ | ✅ | ❌ | ❌ |
| Usuário autenticado (não admin) | Consulta e vê `is_admin: false` | ❌ (403) | ✅ | ❌ (403) | ❌ (403) |
| Administrador | Usuário presente em `public.admin` (função `is_feedback_admin()`) | ✅ | ✅ | ✅ | ✅ |
| Supabase (Auth + RLS) | Valida o JWT e aplica as políticas de linha | Aplica política | Aplica política | Aplica política | Aplica política |

## 3. Caso de uso e regras

### UC-007 — Gerenciar notas de atualização via API

**Pré-condições:** site e API publicados; tabela `game_updates` criada; para escrita, token Bearer de um administrador.

**Fluxo principal**

1. A página carrega e chama `GET /api/updates`; a lista é exibida ordenada da mais recente para a mais antiga.
2. O administrador autenticado (`is_admin: true`) vê os controles de edição.
3. **Criar:** envia `POST /api/updates` com título, versão, data, categoria e descrição → `201` e a nota aparece na lista.
4. **Editar:** envia `PUT /api/updates?id=<uuid>` com os campos alterados → `200` com a nota atualizada.
5. **Excluir:** confirma na interface e envia `DELETE /api/updates?id=<uuid>` → `200 {"deleted": true}`.

**Fluxos alternativos e de exceção**

| Situação | Resposta |
| --- | --- |
| Corpo fora das regras de validação | `400` com mensagem em português |
| Sem token ou sessão inválida | `401` (`code`: `missing_bearer_token`, `session_expired`, …) |
| Usuário não administrador ou origem não autorizada | `403` |
| `id` inexistente em PUT/DELETE | `404` "Atualização não encontrada." |
| `id` fora do formato UUID | `400` "Identificador de atualização inválido." |
| Corpo acima de 48 KiB | `413` |
| Tabela ausente ou falha do Supabase | `503` |

**Pós-condição (sucesso):** o registro é criado, alterado ou removido em `public.game_updates` e a alteração persiste após recarregar a página.

### Regras de negócio (validadas em `server/routes/updates.js` e reforçadas por `CHECK` no banco)

| ID | Regra |
| --- | --- |
| RN-01 | `title`: obrigatório, 1 a 160 caracteres (após `trim`). |
| RN-02 | `version`: obrigatório, 1 a 40 caracteres. |
| RN-03 | `release_date`: obrigatória, data real no formato `AAAA-MM-DD`. |
| RN-04 | `category`: opcional; valores aceitos: Novidades, Melhorias, Correções de bugs, Balanceamento, Eventos, Outros. |
| RN-05 | `description`: obrigatória, 1 a 10000 caracteres. |
| RN-06 | Leitura pública; escrita somente para administradores verificados pelo banco. |
| RN-07 | Listagem ordenada por `release_date` e `created_at`, ambos decrescentes. |
| RN-08 | `PUT` e `DELETE` exigem `id` UUID válido na query string. |

### Requisitos não funcionais

- Respostas JSON em UTF-8 com `Cache-Control: no-store` e `X-Content-Type-Options: nosniff`.
- CORS restrito: origem diferente da própria e fora de `ALLOWED_ORIGINS` recebe `403`.
- Limites de corpo: 4 KiB (rotas comuns), 48 KiB (`/api/updates`), 1 MiB (webhook Stripe).
- Mensagens de erro ao usuário em português; erros internos não expõem detalhes (`500` genérico).
- Segredos (`SUPABASE_SECRET_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`) existem apenas no ambiente do servidor.

## 4. Inventário das APIs cadastradas

Todas as rotas abaixo estão em `server/index.js` (e `server/routes/updates.js`) e documentadas em `Docs/api/swagger.json`.

| # | Método | Rota | Acesso | Função | Sucesso | Erros documentados |
| ---: | --- | --- | --- | --- | :---: | --- |
| 1 | GET | `/api/health` | Público | Verificar disponibilidade | 200 | 403 |
| 2 | GET | `/api/config` | Público | Configuração pública do Supabase | 200 | 403 |
| 3 | GET | `/api/catarse/yokai-tales` | Público | Recompensas da campanha no Catarse | 200 | 403, 502 |
| 4 | POST | `/api/stripe/webhook` | Público (assinatura Stripe) | Atualizar status do pedido | 200 | 400, 413, 500, 503 |
| 5 | GET | `/api/profile` | Bearer | Consultar perfil | 200 | 401, 403, 503 |
| 6 | PATCH | `/api/profile` | Bearer | Alterar nome do perfil | 200 | 400, 401, 403, 413, 503 |
| 7 | GET | `/api/payments` | Bearer | Listar pedidos e downloads | 200 | 401, 403, 503 |
| 8 | POST | `/api/payments` | Bearer | Criar pedido e checkout de teste | 201 | 400, 401, 403, 413, 502, 503 |
| 9 | POST | `/api/downloads` | Bearer | Registrar solicitação de download | 201 | 400, 401, 403, 413 |
| 10 | POST | `/api/account/delete` | Bearer | Excluir a própria conta | 200 | 401, 403, 500, 503 |
| 11 | **GET** | `/api/updates` | Público (Bearer opcional) | **READ** — listar notas | 200 | 401, 403, 503 |
| 12 | **POST** | `/api/updates` | Bearer (admin) | **CREATE** — criar nota | 201 | 400, 401, 403, 413, 503 |
| 13 | **PUT** | `/api/updates?id=` | Bearer (admin) | **UPDATE** — editar nota | 200 | 400, 401, 403, 404, 413, 503 |
| 14 | **DELETE** | `/api/updates?id=` | Bearer (admin) | **DELETE** — excluir nota | 200 | 400, 401, 403, 404, 503 |

Observações de contrato:

- `DELETE` responde **`200` com `{"deleted": true}`** (a API não usa `204`); o Swagger reflete esse comportamento.
- Não há rota de detalhe `GET /api/updates/{id}`; a leitura é pela listagem.
- Autenticação: cabeçalho `Authorization: Bearer <access_token>` emitido pelo Supabase Auth, validado por `authClient.auth.getUser`.

## 5. Exemplos de uso (cURL)

Substitua `BASE` e `TOKEN` (token de um administrador); não registre tokens reais em arquivos ou capturas.

```bash
BASE="https://dgs-website-omega.vercel.app"
TOKEN="<access_token_do_administrador>"

# READ — listar (público)
curl -s "$BASE/api/updates"

# CREATE — resposta esperada: 201
curl -s -X POST "$BASE/api/updates" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"title":"Novas áreas exploráveis","version":"1.2.0","release_date":"2026-10-20","category":"Novidades","description":"Adicionamos novas áreas ao jogo."}'

# UPDATE — resposta esperada: 200
curl -s -X PUT "$BASE/api/updates?id=<UUID>" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"title":"Novas áreas exploráveis","version":"1.2.1","release_date":"2026-10-21","category":"Melhorias","description":"Ajustes adicionais nas novas áreas."}'

# DELETE — resposta esperada: 200 {"deleted":true}
curl -s -X DELETE "$BASE/api/updates?id=<UUID>" -H "Authorization: Bearer $TOKEN"

# Erros esperados
curl -s -X POST "$BASE/api/updates" -H "Content-Type: application/json" -d '{}'              # 401
curl -s -X DELETE "$BASE/api/updates?id=nao-e-uuid" -H "Authorization: Bearer $TOKEN"         # 400
curl -s -X DELETE "$BASE/api/updates?id=00000000-0000-4000-8000-000000000000" \
  -H "Authorization: Bearer $TOKEN"                                                           # 404
```

Exemplo de resposta `201`:

```json
{
  "id": "6f4c1a2b-2c3d-4e5f-8a9b-0c1d2e3f4a5b",
  "title": "Novas áreas exploráveis",
  "version": "1.2.0",
  "release_date": "2026-10-20",
  "category": "Novidades",
  "description": "Adicionamos novas áreas ao jogo.",
  "created_at": "2026-10-20T12:00:00Z"
}
```

## 6. Banco de dados (DDL)

Arquivo: `database/ddl/supabase_atualizacoes.sql` (pré-requisito: `feedback-comments.sql`, que cria `public.is_feedback_admin()`).

| Elemento | Definição |
| --- | --- |
| Tabela | `public.game_updates` |
| Chave primária | `id uuid` com `gen_random_uuid()` |
| `NOT NULL` | `title`, `version`, `release_date`, `description`, `created_at` |
| `CHECK` | `title` 1–160, `version` 1–40, `description` 1–10000 (com `btrim`); `category` nula ou em uma das seis categorias |
| Índice | `game_updates_release_date_created_at_idx (release_date desc, created_at desc)` |
| RLS | Habilitada; `SELECT` para `anon` e `authenticated`; `INSERT`, `UPDATE` e `DELETE` somente quando `is_feedback_admin()` é verdadeiro |
| Privilégios | `revoke all` e `grant` apenas das operações e colunas necessárias |

Tabelas usadas pelas demais rotas (`database/ddl/new-project-schema.sql`): `profiles`, `admin`, `simulated_payments` (`CHECK` de edição, valor 20/40, método e status; FK para `auth.users`) e `game_downloads` (FK para `simulated_payments`).

## 7. Arquitetura

```text
Navegador ──HTTPS──► Vercel (site estático + api/[...path].js)
                          │
                          ▼
                   server/index.js ── roteia ──► server/routes/updates.js
                          │
        ┌─────────────────┼──────────────────┐
        ▼                 ▼                  ▼
  Supabase Auth     Supabase PostgreSQL    Stripe / Catarse
  (valida JWT)      (RLS por usuário/admin) (checkout de teste / recompensas)
```

- **Padrão:** handler HTTP único compartilhado entre Vercel e execução local; autorização delegada ao banco (RLS) com o JWT do próprio usuário.
- **Tecnologias:** HTML/CSS/JavaScript (front-end), Node.js 22 (back-end), Supabase PostgreSQL (banco online), Stripe Checkout em modo de teste, Vercel (hospedagem).

## 8. Segurança (OWASP)

| Risco | Controle implementado |
| --- | --- |
| A01 Broken Access Control | Escrita em `game_updates` só passa pela política RLS que consulta `is_feedback_admin()`; a API não confia em papel enviado pelo cliente. Pedidos e downloads são isolados por usuário. |
| A03 Injection | Acesso ao banco pelo cliente Supabase (consultas parametrizadas); validação de tipo, tamanho, data e enum antes de gravar; `id` validado por regex UUID. |
| A05 Security Misconfiguration | CORS por lista de origens; `.gitignore` bloqueia `.env`; chaves secretas somente no servidor. |
| A07 Identification and Authentication Failures | Token Bearer verificado a cada requisição; diagnóstico de falha (`code`) sem expor o token. |
| A08 Software and Data Integrity | Webhook Stripe valida a assinatura sobre o corpo bruto antes de alterar pedidos. |

## 9. Documentação da API (OpenAPI)

- **Arquivo:** `Docs/api/swagger.json` — OpenAPI **3.0.3**, 14 operações, 7 tags, esquema de segurança `BearerAuth` (HTTP bearer, JWT).
- **Servidores:** aplicação publicada na Vercel e mesma origem (`/`).
- **Cada operação** traz `summary`, `operationId` único, `requestBody` quando há corpo, `responses` com exemplos e `security` (`[]` nas rotas públicas; `BearerAuth` nas protegidas; `GET /api/updates` aceita anônimo ou Bearer).
- **Componentes reutilizáveis:** 19 esquemas e 8 respostas de erro (`BadRequest`, `Unauthorized`, `Forbidden`, `NotFound`, `PayloadTooLarge`, `BadGateway`, `InternalError`, `ServiceUnavailable`).
- **Como conferir:** abrir o arquivo em https://editor.swagger.io (File → Import file) e executar os cURL da seção 5 contra a URL publicada.

## 10. Limites desta versão

- A aplicação não publica Swagger UI; a visualização é feita pelo Swagger Editor.
- Não existe `.env.example` versionado; as variáveis necessárias estão descritas no `README.md` (`SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `PUBLIC_APP_URL`, `ALLOWED_ORIGINS`, `GAME_RELEASE_VERSION`).
- O checkout Stripe segue em modo de teste e o arquivo real do jogo ainda não está publicado.
- A execução dos testes (`npm test`) e a validação do CRUD na URL publicada devem ser registradas como evidência antes da entrega.
