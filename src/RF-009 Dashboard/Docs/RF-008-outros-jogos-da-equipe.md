# RF-008: Outros Jogos da Equipe

## 1. Identificacao

- **ID:** RF-008
- **Titulo:** Outros Jogos da Equipe
- **Prioridade:** Media
- **Complexidade:** 5 story points
- **Projeto:** Digital Ghost Software — Yokai Tales
- **Atualizacao:** 17/11/2026
- **Status:** Implementado no repositório. A tabela, a API, a pagina e o contrato OpenAPI existem e devem ser validados no ambiente publicado.

### a) URL da Aplicacao (Deploy Online)

- **URL:** https://dgs-website-omega.vercel.app/paginas/outros_jogos.html
- **Plataforma:** Vercel
- **Acesso:** Consulta publica. Cadastro, edicao e exclusao exigem login de administrador.

### b) Banco de Dados

- **BD:** Supabase PostgreSQL
- **Projeto:** `DGS_Web_Site`
- **Link:** https://supabase.com/dashboard/project/thmtriwgvsgxdinsuxph
- **Tabela:** `public.other_games`
- **Bucket:** `other-games`

### c) Repositorio

- **Repositorio:** https://github.com/Digital-Ghost-Software/DGS_website
- **Branch principal:** main

### Documentacao da API

- **Arquivo:** `Docs/api/swagger.json`
- **Formato:** OpenAPI 3.0.3
- **Operacoes:** `GET`, `POST`, `PUT` e `DELETE` em `/api/games`
- **Upload:** `POST /api/games?action=upload-image`

---

## 2. Descricao e Atores

### Descricao

O requisito cria a secao **Outros Jogos da Equipe**, com cards dos jogos da Digital Ghost Software. Cada card contem nome, link externo, caminho da imagem e URL publica da imagem.

A consulta é pública. Um visitante pode listar os cards sem autenticação. Administradores podem enviar imagens, criar cards, editar cards e excluir cards. As operacoes escritas sao protegidas por Supabase Auth e RLS.

### Atores

#### Visitante

- Consulta a lista de jogos por `GET /api/games`.
- Não precisa enviar token.
- Não vê e não pode executar ações administrativas.

#### Usuario autenticado

- Pode consultar a lista com o Bearer token.
- Recebe `is_admin: false` quando não é administrador.
- Tentativas de escrita recebem `403` quando bloqueadas pelo banco.

#### Administrador

- Pode enviar imagem, criar, editar e excluir jogos.
- Recebe `is_admin: true` no `GET /api/games`.
- Os privilegios são confirmados pela função `public.is_feedback_admin()` e pelas políticas RLS.

#### Supabase

- Valida o token da sessao.
- Aplica RLS na tabela `other_games` e no bucket `other-games`.
- Gera a URL publica da imagem armazenada.

### Validacoes Necessarias

- `name`: texto obrigatorio, de 1 a 120 caracteres.
- `url`: URL obrigatoria, HTTP ou HTTPS, sem credenciais, com até 2048 caracteres.
- `image_path`: caminho obrigatório no formato `<user_uuid>/<game_uuid>.(png|jpg|webp)`.
- `id`: UUID válido nas operações de atualização e exclusão.
- Upload: PNG, JPEG ou WebP válido, máximo de 3 MiB.
- O upload só pode gravar a imagem na pasta do usuário autenticado.
- Na criacao e atualizacao, a imagem deve pertencer à sessao atual.
- Cards são ordenados por `created_at` decrescente.

---

## 3. Casos de Uso

### Fluxo Principal: Cadastro de um jogo

**Pre-condicoes:**
- Usuario autenticado como administrador.
- Pagina `outros_jogos.html` aberta.

**Fluxo:**
1. A pagina chama `GET /api/games`.
2. A API devolve `games` e `is_admin`.
3. O administrador clica em "Adicionar jogo".
4. Informa nome, link e seleciona uma imagem.
5. A interface valida o tipo e o tamanho da imagem.
6. A interface envia `POST /api/games?action=upload-image` com `content_type` e `image_data` em base64.
7. A API valida assinatura, formato e tamanho, grava no bucket e devolve `201` com `image_path`.
8. A interface envia `POST /api/games` com `name`, `url` e `image_path`.
9. A API grava o card e devolve `201` com o registro e `image_url`.
10. A pagina recarrega os cards e mostra a mensagem de sucesso.

**Pos-condicoes:**
- O card permanece em `public.other_games`.
- A imagem permanece no bucket `other-games`.
- O card aparece apos recarregar a pagina.

### Fluxo de Leitura

1. O visitante abre a pagina.
2. A interface envia `GET /api/games`.
3. A API consulta os cards e gera as URLs publicas das imagens.
4. A lista é exibida em cards responsivos.
5. Quando existe token válido, o campo `is_admin` determina se o gerenciamento aparece.

Não existe uma operação REST de detalhe por `/api/games/{id}`. O Swagger implementado não documenta essa rota.

### Fluxo de Atualizacao

1. O administrador clica em "Editar".
2. A interface preenche nome e link; a imagem atual continua selecionada.
3. Se o usuario escolher nova imagem, ela é enviada por `POST /api/games?action=upload-image`.
4. A interface chama `PUT /api/games?id=<UUID>` com `name`, `url` e `image_path`.
5. A API atualiza o registro e remove a imagem anterior.
6. A pagina recarrega a lista e informa sucesso.

### Fluxo de Exclusao

1. O administrador clica em "Excluir".
2. O navegador solicita confirmacao.
3. A interface envia `DELETE /api/games?id=<UUID>`.
4. A API exclui o card e remove sua imagem.
5. A API responde `200` com `{ "deleted": true }`.
6. A pagina recarrega a lista.

### Fluxos Alternativos

#### A1: Dados invalidos

A API responde `400` com uma mensagem em português. A interface mantém os dados preenchidos e mostra o erro.

#### A2: Sessao ausente ou expirada

Operacoes administrativas sem token valido respondem `401`. Para o `GET`, uma sessão expirada pode ser removida e a consulta pública repetida sem token.

#### A3: Usuario sem permissao

Um usuario autenticado sem perfil de administrador recebe `403`.

#### A4: Jogo inexistente

`PUT` ou `DELETE` com UUID inexistente respondem `404`.

#### A5: Falha de banco ou armazenamento

Banco ou bucket não configurados, e falhas de operacao, podem resultar em `503`. A interface mostra uma mensagem em português e permite nova tentativa.

### Requisitos Não-Funcionais

- RNF-01: Interface responsiva em mobile, tablet e desktop.
- RNF-02: Operacoes normais devem responder em até 2 segundos.
- RNF-03: Mensagens em português UTF-8.
- RNF-04: Requisições JSON são limitadas pela API; respostas usam JSON.
- RNF-05: A leitura funciona sem autenticação.

### Regras de Negocio

- RN-01: Leitura pública; escrita somente para administradores.
- RN-02: `name`, `url` e `image_path` são obrigatórios no card.
- RN-03: O link aceita HTTP ou HTTPS, mas não aceita credenciais na URL.
- RN-04: O upload aceita apenas PNG, JPEG ou WebP, até 3 MiB.
- RN-05: A atualizacao e a exclusao exigem UUID válido no parâmetro `id`.
- RN-06: Atualizacao ou exclusao inexistente retorna `404`.
- RN-07: A listagem usa `created_at` decrescente.
- RN-08: A exclusao remove o card e tenta remover também a imagem.

---

## 4. Prototipo

Interface implementada em: https://dgs-website-omega.vercel.app/paginas/outros_jogos.html

| Operação | Método | Endpoint | Status esperado |
|---|---|---|---|
| Create do card | POST | `/api/games` | 201 |
| Upload da imagem | POST | `/api/games?action=upload-image` | 201 |
| Read da lista | GET | `/api/games` | 200 |
| Update | PUT | `/api/games?id=<UUID>` | 200 |
| Delete | DELETE | `/api/games?id=<UUID>` | 200 |

Não existe operação `GET /api/games/{id}` neste contrato.

### Respostas de erro por operação

| Operação | Erros documentados |
|---|---|
| GET `/api/games` | 401, 403, 503 |
| POST `/api/games?action=upload-image` | 400, 401, 403, 413, 503 |
| POST `/api/games` | 400, 401, 403, 413, 503 |
| PUT `/api/games?id=<UUID>` | 400, 401, 403, 404, 413, 503 |
| DELETE `/api/games?id=<UUID>` | 400, 401, 403, 404, 503 |

A documentação completa permanece em `Docs/api/swagger.json`. Cada operação possui `summary`, `operationId`, `responses` e esquema de segurança. As operações escritas usam `BearerAuth`.

### Campos do card no Swagger

| Campo | Tipo | Obrigatorio | Regra |
|---|---|:---:|---|
| `name` | texto | Sim | 1 a 120 caracteres |
| `url` | URL | Sim | HTTP ou HTTPS, até 2048 caracteres |
| `image_path` | texto | Sim | Caminho válido do bucket |
| `id` | UUID | Resposta | Gerado pelo banco |
| `image_url` | URL | Resposta | Gerada pelo servidor |
| `created_at` | date-time | Resposta | Gerada pelo banco |

Campos adicionais do upload:

| Campo | Tipo | Obrigatorio | Regra |
|---|---|:---:|---|
| `content_type` | enum | Sim | `image/png`, `image/jpeg` ou `image/webp` |
| `image_data` | base64 | Sim | Conteúdo da imagem, máximo de 3 MiB |

### Estados de tela

| Estado | Como aparece |
|---|---|
| Vazio | "Ainda não há jogos publicados." |
| Carregando | "Carregando jogos..." |
| Preenchido | Cards com imagem, nome e link |
| Erro | Mensagem vermelha com causa em português |
| Sucesso | Mensagem verde após adicionar, editar ou excluir |

### Script DDL

- **Arquivo:** `database/ddl/supabase_outros_jogos.sql`
- **Conteúdo:** tabela `public.other_games`, índice por `created_at`, RLS para leitura pública e escrita administrativa, bucket público `other-games` e políticas de upload e exclusao de imagem.

### Exemplos de requisição

Substitua `TOKEN` pelo token de um administrador; não registre tokens reais no repositório.

```bash
BASE="https://dgs-website-omega.vercel.app"
TOKEN="<access_token_do_administrador>"

# READ da lista
curl -s "$BASE/api/games"

# READ autenticado e com indicador administrativo
curl -s "$BASE/api/games" \
  -H "Authorization: Bearer $TOKEN"

# Upload da imagem
curl -s -X POST "$BASE/api/games?action=upload-image" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content_type":"image/png","image_data":"<BASE64>"}'

# CREATE do card
curl -s -X POST "$BASE/api/games" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Jogo de Exemplo","url":"https://exemplo.com/jogo","image_path":"<USER_UUID>/<GAME_UUID>.png"}'

# UPDATE
curl -s -X PUT "$BASE/api/games?id=<UUID>" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Jogo Atualizado","url":"https://exemplo.com/jogo","image_path":"<USER_UUID>/<GAME_UUID>.png"}'

# DELETE
curl -s -i -X DELETE "$BASE/api/games?id=<UUID>" \
  -H "Authorization: Bearer $TOKEN"
```

### Roteiro de teste

1. Abrir a pagina em janela anonima e conferir a listagem publica.
2. Fazer login como administrador e conferir o gerenciamento.
3. Enviar uma imagem válida e conferir o upload no bucket.
4. Criar um card e conferir a linha em `public.other_games`.
5. Editar o card e conferir a atualizacao no banco.
6. Substituir ou manter a imagem e conferir o tratamento no armazenamento.
7. Excluir o card e conferir a remocao da linha e da imagem.
8. Repetir operações sem token e com usuario comum.
9. Abrir `Docs/api/swagger.json` no editor Swagger e comparar com os testes.

---

## 5. Arquitetura

### Componentes

- **Frontend:** HTML, CSS e JavaScript puro em `paginas/outros_jogos.html` e `js/outros-jogos.js`.
- **Backend:** Node.js com o manipulador `server/routes/games.js`.
- **Banco:** Supabase PostgreSQL com RLS.
- **Armazenamento:** bucket público `other-games`.
- **Autenticacao:** Supabase Auth com Bearer token.
- **Hospedagem:** Vercel.

### Diagrama

```text
Navegador
  |
  | HTTPS
  v
Vercel / API
  |
  +--> Roteador /api/games
  |      |
  |      +--> Supabase Auth
  |      +--> Supabase Storage
  |      +--> Supabase PostgreSQL (other_games + RLS)
  |
  v
Resposta JSON
```

### Fluxo de Dados

Usuario → Interface → `fetch` em `/api/games` → Roteador → Validacao → Supabase Auth/Storage/PostgreSQL → RLS → Resposta JSON → Interface atualiza a tela.

### Decisoes Arquiteturais

- **ADR-001:** Frontend estático em HTML, CSS e JavaScript.
- **ADR-002:** Upload separado do cadastro do card. O primeiro retorna `image_path`; o segundo grava os dados da tabela.
- **ADR-003:** `PUT` e `DELETE` recebem `id` no query parameter `?id=<UUID>`, conforme a implementação atual.
- **ADR-004:** `DELETE` responde `200` com `deleted: true`, não `204`.
- **ADR-005:** A imagem anterior é removida quando o card é atualizado ou excluído.
- **ADR-006:** Permissões administrativas são verificadas pelo banco por RLS.

---

## 6. Segurança

### Controle 1: Controle de acesso

O banco aplica RLS em `other_games` e no bucket. O servidor também exige sessão autenticada nas operações escritas. Nenhum papel administrativo enviado pelo navegador é considerado confiável.

**Teste:** usar conta comum para criar, editar, excluir ou enviar imagem e confirmar `403`.

### Controle 2: Validacao de entrada

O servidor valida objeto JSON, nome, URL, caminho da imagem, UUID e metodos HTTP. Consultas ao banco usam o cliente Supabase, sem SQL concatenado pelo navegador.

**Teste:** enviar URL `javascript:alert(1)`, UUID inválido e campos fora dos limites; confirmar `400`.

### Controle 3: Integridade de imagem

O servidor aceita apenas PNG, JPEG e WebP. Verifica assinatura dos bytes, tamanho máximo, base64 válido e correspondência entre conteúdo e `content_type`.

**Teste:** enviar conteúdo que não seja imagem ou que não corresponda ao tipo declarado e confirmar `400`.

### Controle 4: Autenticacao

Toda operação escrita exige Bearer token válido. Tokens ausentes, expirados ou inválidos são rejeitados pelo fluxo de autenticação.

**Teste:** chamar POST, PUT e DELETE sem token e com token adulterado ou expirado; confirmar `401`.

### Controle 5: CORS e segredos

A API valida a origem permitida e não expõe chaves secretas ao navegador. As variáveis sensíveis permanecem no ambiente do servidor e não devem ser registradas no repositório.
