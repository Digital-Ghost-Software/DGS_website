# RF-009: Dashboard Administrativo

## 1. Identificacao

- **ID:** RF-009
- **Titulo:** Dashboard Administrativo
- **Tipo:** Requisito Funcional
- **Prioridade:** Alta
- **Justificativa da prioridade:** O painel concentra informacoes operacionais sobre visitas, downloads e contas cadastradas. Permite acompanhar o uso do site e exige protecao administrativa reforcada.
- **Complexidade:** 5 story points
- **Projeto:** Digital Ghost Software - Yokai Tales
- **Criado em:** 17/11/2026
- **Atualizado em:** 17/11/2026
- **Status:** Implementado no repositorio e em validacao no ambiente publicado.

### a) URL da aplicacao (deploy online)

- **URL:** https://dgs-website-omega.vercel.app/paginas/dashboard.html
- **Plataforma:** Vercel
- **Acesso:** O layout abre na pagina, mas os dados exigem conta autenticada com perfil de administrador.

### b) Banco de dados online

- **BD:** Supabase PostgreSQL
- **Link:** https://supabase.com/dashboard/project/penkfiaczkgvkxaztfms
- **Projeto:** `DGS_Web_Site`
- **Acesso:** leitura para o professor, conforme configuracao da entrega (convite enviado!)
- **Tabelas principais:** `public.page_visits`, `public.game_downloads`, `public.profiles`, `public.admin`, `auth.users`

### c) Link do GitHub

- **Repositorio:** https://github.com/Digital-Ghost-Software/DGS_website
- **Branch principal:** main

### Estrutura relacionada

- Interface: `paginas/dashboard.html`
- Estilos: `css/dashboard.css`
- Cliente: `js/dashboard.js`
- Registro independente de visitas: `js/analytics.js`
- Roteador: `server/routes/dashboard.js`
- Migracao: `database/ddl/dashboard-analytics.sql`
- Testes: `tests/unit/dashboard-api.test.js`
- Contrato: `Docs/api/swagger.json`

---

## 2. Descricao e atores

### Descricao

O RF-009 apresenta um dashboard administrativo para acompanhar a utilizacao do site Yokai Tales. O painel exibe o numero total de downloads registrados, o numero de visitas por pagina monitorada e uma lista de usuarios cadastrados com identificador, nome, e-mail, nivel, data de cadastro, ultimo acesso e confirmacao de e-mail.

A pagina envia o bearer token da sessao para `GET /api/dashboard`. O servidor valida o token, chama `public.is_feedback_admin()` e consulta somente as informacoes previstas pela interface. O usuario comum recebe `403`, enquanto o administrador recebe as metricas em JSON.

As paginas monitoradas carregam `js/analytics.js`, que envia o caminho atual para `POST /api/analytics/visit`. A API aceita somente uma lista de caminhos permitidos e normaliza `/index.html` para `/`. A contagem usa a tabela `public.page_visits` e uma funcao SQL com `security definer`, limitada a execucao pelo role de servidor.

### Beneficios para o negocio

- Permite acompanhar quais paginas recebem mais visitas.
- Mostra o volume de downloads registrados.
- Facilita a consulta de contas cadastradas sem exibir senhas.
- Ajuda a planejar melhorias de conteudo e areas de maior interesse.
- Centraliza metricas operacionais em uma interface administrativa protegida.

### Atores

#### Visitante

- **Papel:** Navegar pelas paginas monitoradas.
- **Permissoes:** Pode gerar uma visita em `POST /api/analytics/visit`.
- **Acesso:** Nenhum acesso aos dados administrativos.

#### Usuario autenticado

- **Papel:** Utilizar o site e tentar abrir o dashboard.
- **Permissoes:** Read apenas das proprias funcionalidades previstas pelas demais APIs.
- **Acesso:** Recebe `403` ao consultar `/api/dashboard` sem perfil administrativo.

#### Administrador

- **Papel:** Consultar metricas e usuarios.
- **Permissoes:** Read das visitas, downloads e projecao segura dos usuarios.
- **Acesso:** `paginas/dashboard.html` e `GET /api/dashboard`.

#### Sistema servidor

- **Papel:** Validar o token, verificar o perfil administrativo e consultar dados com a chave administrativa.
- **Permissoes:** Executar a contagem de visitas e ler somente campos permitidos.

#### Supabase

- **Papel:** Validar sessao, aplicar RLS e manter contadores e registros.
- **Permissoes:** Funcoes e grants limitados ao servidor e ao role administrativo.

### Matriz CRUD

| Ator | Create | Read | Update | Delete |
|---|:---:|:---:|:---:|:---:|
| Visitante | Registra visita via POST | Nao | Nao | Nao |
| Usuario autenticado comum | Nao | Nao no dashboard | Nao | Nao |
| Administrador | Nao | Visitas, downloads e usuarios | Nao | Nao |
| Supabase/servidor | Incrementa contador | Fornece metricas ao admin | Nao | Nao |

O dashboard nao implementa um CRUD de usuarios ou metricas. As acoes disponiveis sao registro de visitas e consulta administrativa.

### Validacoes necessarias

- `page_path` e obrigatorio e deve pertencer a lista permitida no servidor.
- `/index.html` e normalizado para `/` antes da contagem.
- Metodo diferente de POST em `/api/analytics/visit` retorna `405`.
- `/api/dashboard` exige bearer token valido.
- Usuario sem perfil administrativo recebe `403`.
- A resposta nao pode conter senhas ou campos fora da projecao exibida.
- Falhas de banco ou configuracao administrativa retornam `503`.

---

## 3. Casos de uso e regras

### UC-009A: Registrar visita

**Pre-condicoes:**

- A pagina carregou o script `js/analytics.js`.
- A API e o Supabase estao configurados.
- A tabela `page_visits` e a funcao `record_page_visit` foram criadas.

**Fluxo principal:**

1. O navegador abre uma pagina monitorada.
2. `analytics.js` captura `window.location.pathname`.
3. O navegador envia `POST /api/analytics/visit` com `page_path`.
4. O servidor valida se o caminho pertence a lista permitida.
5. O servidor normaliza `/index.html` para `/`.
6. O servidor verifica se a chave administrativa esta configurada.
7. A API chama `record_page_visit(p_page_path)`.
8. A funcao SQL cria o registro com contagem 1 ou incrementa a contagem existente.
9. A API responde `200` com `{ "recorded": true }`.
10. A falha de registro nao interrompe a navegacao da pagina.

**Pos-condicoes:**

- Em sucesso: o contador da pagina aumenta em uma unidade em `public.page_visits`.
- Em falha: nenhuma contagem e tratada como registrada; o navegador registra apenas o erro no console.

### UC-009B: Consultar dashboard

**Pre-condicoes:**

- O usuario esta autenticado.
- A conta possui perfil de administrador em `public.admin`.
- A pagina `dashboard.html` e a API estao publicadas.

**Fluxo principal:**

1. O administrador abre `paginas/dashboard.html`.
2. A interface busca a sessao Supabase.
3. Sem sessao, o painel mostra a orientacao para entrar com conta administrativa.
4. Com sessao, a pagina chama `GET /api/dashboard` com bearer token.
5. O servidor valida o token.
6. O servidor chama `is_feedback_admin()`.
7. Em caso positivo, o servidor consulta visitas, quantidade de downloads e usuarios.
8. O servidor retorna apenas os campos permitidos.
9. A interface monta as tabelas e o contador de downloads.
10. O conteudo aparece e a mensagem de carregamento fica escondida.

**Pos-condicoes:**

- Em sucesso: o administrador visualiza dados atualizados sem recarregar codigo.
- Em falha: o painel mostra uma mensagem em portugues e nao representa dados inexistentes como sucesso.

### Fluxos alternativos

#### A1: Caminho desconhecido

- `POST /api/analytics/visit` recebe um caminho fora da lista.
- A API responde `400` com `Página inválida para registrar visita.`
- Nenhuma funcao de contador e chamada.

#### A2: Metodo incorreto

- A rota recebe GET em vez de POST ou POST em `/api/dashboard`.
- A API responde `405` com `Método não permitido.`

#### A3: Usuario nao autenticado

- `GET /api/dashboard` nao possui bearer token valido.
- A API responde `401`.
- A interface orienta a entrar com uma conta administrativa.

#### A4: Usuario sem permissao

- O usuario autenticado nao esta em `public.admin`.
- A API responde `403`.
- Nenhuma metrica e retornada.

#### A5: Servico indisponivel

- Configuracao administrativa, Supabase, tabela ou grant esta ausente.
- A API responde `503`.
- A interface mostra uma mensagem em portugues e permite nova tentativa.

#### A6: Origem nao autorizada no registro de visitas

- `POST /api/analytics/visit` recebe uma requisicao com cabeçalho `Origin` fora da lista permitida.
- A API responde `403`.
- Nenhuma contagem e registrada, pois a origem foi bloqueada antes da chamada da API.

### Regras de negocio

- **RN-01:** Somente caminhos cadastrados podem ser contabilizados.
- **RN-02:** `/index.html` e `/` representam a pagina inicial na tabela de visitas.
- **RN-03:** Cada chamada valida aumenta o contador da pagina em uma unidade.
- **RN-04:** O registro de visita nao exige login.
- **RN-05:** A consulta do dashboard exige sessao e perfil administrativo.
- **RN-06:** A resposta de usuarios nao inclui senha nem dados fora da projecao definida.
- **RN-07:** Downloads contam registros de `public.game_downloads`.
- **RN-08:** Falhas nao devem produzir conteudo ou sucesso simulado.

### Requisitos nao-funcionais

- **RNF-01:** Interface responsiva em larguras mobile, tablet e desktop.
- **RNF-02:** Tabelas ficam com rolagem horizontal em telas estreitas.
- **RNF-03:** Mensagens de estado sao exibidas em portugues.
- **RNF-04:** Chamadas usam JSON UTF-8 e `Cache-Control: no-store`.
- **RNF-05:** Dados de usuarios sao renderizados com `textContent`, evitando interpretacao de HTML.
- **RNF-06:** O dashboard apresenta carregamento, preenchido e erro; dados nao carregados ficam ocultos.

---

## 4. Prototipo funcional

Pagina implementada em:

https://dgs-website-omega.vercel.app/paginas/dashboard.html

### Operacoes do dashboard

| Operacao | Metodo | Endpoint | Acesso | Status esperado |
|---|---|---|---|---:|
| Registrar visita | POST | `/api/analytics/visit` | Publico | 200 |
| Consultar dashboard | GET | `/api/dashboard` | Administrador | 200 |

Erros esperados:

| Operacao | Erros documentados |
|---|---|
| POST `/api/analytics/visit` | 400 (pagina invalida), 403 (origem nao autorizada), 405 (metodo incorreto), 503 (servico indisponivel) |
| GET `/api/dashboard` | 401, 403, 405, 503 |

### Estados da interface

| Estado | Comportamento |
|---|---|
| Carregamento | Mensagem `Carregando dados do painel…` |
| Preenchido | Contador, tabela de visitas e tabela de usuarios |
| Erro | Mensagem vermelha sem dados simulados |
| Sem sessao | Orientacao para entrar com conta administrativa |
| Dados vazios | Contadores zerados e tabelas sem registros, conforme dados reais |

### Roteiro de teste

1. Abrir diferentes paginas no navegador anonimo.
2. Conferir que cada caminho permitido incrementa `page_visits`.
3. Tentar enviar caminho desconhecido e confirmar `400`.
4. Abrir o dashboard sem login e confirmar bloqueio.
5. Entrar com usuario comum e confirmar `403`.
6. Entrar como administrador e confirmar `200`.
7. Conferir downloads e usuarios retornados pelo banco.
8. Recarregar a pagina e confirmar persistencia das contagens.
9. Testar a interface em mobile, tablet e desktop.
10. Abrir `Docs/api/swagger.json` no editor Swagger e comparar com os testes.

### Resposta esperada

```json
{
  "visits": [
    {
      "page_path": "/",
      "visit_count": 42
    }
  ],
  "downloads": 7,
  "users": [
    {
      "id": "6f4c1a2b-2c3d-4e5f-8a9b-0c1d2e3f4a5b",
      "email": "usuario@exemplo.com",
      "user_name": "Usuario",
      "user_level": "standard",
      "created_at": "2026-10-20T12:00:00Z",
      "last_sign_in_at": "2026-10-21T12:00:00Z",
      "email_confirmed_at": "2026-10-20T12:05:00Z"
    }
  ]
}
```

### Script DDL

- **Arquivo:** `database/ddl/dashboard-analytics.sql`
- **Pre-requisito:** `new-project-schema.sql` e `feedback-comments.sql`
- **Conteudo:** tabela `page_visits`, RLS, grants do servidor, grants de leitura somente em campos necessarios e funcao `record_page_visit(text)`.

As rotas `/api/analytics/visit` e `/api/dashboard` estao documentadas em `Docs/api/swagger.json`, com schemas, seguranca Bearer no endpoint administrativo, exemplos e respostas.

---

## 5. Arquitetura

### Diagrama

```text
Paginas do site
  |
  | POST /api/analytics/visit
  v
Vercel / server/index.js
  |
  v
server/routes/dashboard.js
  |
  +--> Supabase Auth
  +--> public.is_feedback_admin()
  +--> public.record_page_visit(text)
  +--> public.page_visits
  +--> public.game_downloads
  +--> public.profiles
  +--> public.admin
  +--> auth.users

Navegador administrativo
  |
  | GET /api/dashboard + Bearer
  v
server/routes/dashboard.js
  |
  v
JSON -> js/dashboard.js -> tabelas HTML
```

### Fluxo de dados

Navegador -> `analytics.js` -> endpoint de visita -> validacao da lista -> funcao SQL -> contador persistente.

Administrador -> sessao Supabase -> bearer token -> verificacao administrativa -> consultas com chave de servidor -> projecao de usuarios -> resposta JSON -> renderizacao segura.

### ADR

O sistema segue o modelo organizacional em camadas: interface HTML/CSS/JavaScript, API Node.js, autenticacao e dados no Supabase. Essa organizacao foi adotada porque separa apresentacao, controle HTTP e persistencia, reutiliza o mesmo backend em Vercel e desenvolvimento local e permite aplicar RLS sem duplicar a autorizacao no frontend.

#### ADR-001: Registro de visitas independente da inicializacao Supabase

`js/analytics.js` usa fetch nativo e nao depende da biblioteca ou da configuracao publica do Supabase. Toda pagina monitorada pode registrar a visita sem bloquear a navegacao.

#### ADR-002: Lista branca de caminhos

O servidor valida `page_path` contra uma lista fixa. Caminhos externos nao sao armazenados e nao podem criar registros arbitrarios na tabela.

#### ADR-003: Escrita de contadores exclusiva do servidor

O frontend nao grava diretamente em `page_visits`. A funcao SQL tem `security definer`, mas somente o role `service_role` pode executa-la.

#### ADR-004: Dashboard protegido por autenticacao e perfil administrativo

O painel exige bearer token e chama `is_feedback_admin()` no servidor. O navegador nao decide se o usuario e administrador.

#### ADR-005: Projecao limitada de usuarios

A API monta explicitamente os campos retornados e nao devolve senhas, hashes ou metadados completos.

#### ADR-006: OpenAPI centralizado

As duas rotas sao documentadas em `Docs/api/swagger.json`, com status reais, schemas, exemplos e `BearerAuth` no endpoint administrativo.

---

## 6. Seguranca OWASP

### Controle 1: Broken Access Control - A01

- **Vulnerabilidade:** usuario comum acessar metricas ou usuarios.
- **Implementacao:** `/api/dashboard` valida o token e exige `is_feedback_admin() === true`.
- **Teste:** usuario comum recebe `403` e nenhuma parte da resposta de metricas e entregue.

### Controle 2: Permissoes excessivas - A01/A04

- **Vulnerabilidade:** role autenticado consultar todas as paginas ou campos de perfil.
- **Implementacao:** RLS no `page_visits`, grants limitados ao `service_role` e projecao explicita dos usuarios.
- **Teste:** verificar DDL e confirmar que senhas nao aparecem na resposta.

### Controle 3: Entrada nao permitida - A03

- **Vulnerabilidade:** pagina arbitraria alterar contadores ou criar caminhos.
- **Implementacao:** `page_path` e validado contra lista fixa antes da chamada SQL.
- **Teste:** caminho desconhecido retorna `400` e nao chama RPC.

### Controle 4: Falhas de autenticacao - A07

- **Vulnerabilidade:** dashboard aceitar token ausente, expirado ou adulterado.
- **Implementacao:** Supabase Auth valida o bearer token em cada chamada administrativa.
- **Teste:** chamada sem token retorna `401`; token invalido nao executa consultas.

### Controle 5: Segredos e configuracao - A05

- **Vulnerabilidade:** chave administrativa exposta ao navegador ou configuracao ausente.
- **Implementacao:** a chave administrativa fica somente no ambiente do servidor e o frontend nao recebe a chave.
- **Teste:** buscar segredo no codigo publicado e confirmar que somente valores publicaveis aparecem em `/api/config`.

---

## 7. Correcoes relacionadas aos RFs anteriores

### RF-006 - Feedback do Cliente

- Corrigido o limite do comentario para 15 a 1.000 caracteres no frontend, na tabela Supabase e no teste de migracao.
- Adicionada validacao visual com borda verde/vermelha, `aria-invalid`, `✓` e `✗`.
- Adicionado indicador de carregamento e estados de sucesso e erro.
- Corrigidos os links da pagina inicial para `paginas/feedback.html`, `paginas/outros_jogos.html` e `paginas/doacoes.html`.
- Reescrito o documento com beneficios, matriz CRUD, fluxos alternativos, RNFs, arquitetura, ADRs e controles OWASP com teste.

### RF-007 - APIs cadastradas e Swagger

- Completado o inventario das APIs reais e seu contrato OpenAPI.
- Acrescentados beneficios, fluxo principal com oito passos, pos-condicao de falha e requisitos nao-funcionais.
- Documentada a validacao visual da pagina de atualizacoes.
- Incluidos quatro ADRs e vulnerabilidade/implementacao/teste para os controles OWASP.
- Mantidas coerentes as respostas reais, como `DELETE /api/updates` respondendo `200` com `{ "deleted": true }`.
- Incluidas as rotas do dashboard no Swagger.

### RF-008 - Outros Jogos da Equipe

- Corrigida a URL da pagina para `paginas/outros_jogos.html`.
- Corrigida a tabela documentada de `team_games` para `public.other_games`.
- Substituido o modelo ficticio por campos reais: `name`, `url`, `image_path`, `image_url` e `created_at`.
- Documentadas as operacoes reais em `/api/games`, inclusive upload em `POST /api/games?action=upload-image`.
- Corrigidos os parametros de atualizacao e exclusao para `?id=<UUID>`.
- Removidas a rota de detalhe `/api/games/{id}` e a resposta `204` que nao existiam na implementacao.
- As operacoes e schemas de jogos foram adicionados ao `swagger.json`.

Essas correcoes alinham RF-006, RF-007 e RF-008 com o codigo atual, as migracoes, as respostas HTTP e o contrato OpenAPI.
