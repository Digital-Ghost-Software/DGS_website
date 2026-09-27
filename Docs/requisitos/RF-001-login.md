# RF-001 — Autenticar usuário

## 1. Identificação (2%)

| Campo | Valor |
|---|---|
| ID / título | RF-001 — Autenticar usuário |
| Tipo / prioridade | Funcional / Alta |
| Complexidade | Média, estimativa inicial de 5 story points (confirmar pela equipe). |
| Status | Supabase Auth validado com contas de teste; login, logout, perfil e recuperação de senha foram confirmados. Deploy de produção e evidências visuais responsivas continuam pendentes. |
| Projeto | Digital Ghost Software — Yokai Tales |
| Atualização | 27/09/2026 |

**Projeto/equipe:** Digital Ghost Software — Yokai Tales; integrantes conforme a relação do documento RF-004. Repositório informado: [AndreBlackDragon/YokaiTales-Webpage](https://github.com/AndreBlackDragon/YokaiTales-Webpage), branch `main`. A conexão Supabase é configurada no ambiente local; não registrar chaves nem URLs de ambiente neste relatório. Deploy e Swagger não informados.

**Descrição breve:** permitir que um usuário com conta confirmada autentique-se por e-mail e senha e acesse o próprio perfil e as funções vinculadas à conta.

## 2. Descrição e atores (6%)

A autenticação identifica o usuário antes de apresentar dados pessoais, histórico de pedidos ou ações de conta. Isso evita associar pedidos a uma identidade informada livremente no navegador, mantém os dados de conta separados e permite controlar os acessos ao Supabase.

| Ator | Papel/responsabilidade | CRUD no escopo |
|---|---|---|
| Usuário | Informa credenciais e acessa a própria conta. | Read da própria sessão; não administra contas alheias. |
| Aplicação web | Envia credenciais ao Supabase Auth e direciona a navegação. | Solicita autenticação; não lê senha/hash do banco. |
| Supabase Auth | Valida credenciais, gerencia sessão e retorna usuário autenticado. | Create/Read/Update/Delete de credenciais conforme serviço e políticas do projeto. |

## 3. Casos de uso e RNF (15%)

### UC-001 — Entrar

**Pré-condições:** página carregada por HTTP/HTTPS; Supabase URL/chave publicável configuradas; conta existente e, se ativado no projeto, e-mail confirmado.

**Fluxo principal:** (1) usuário abre login; (2) informa e-mail; (3) informa senha; (4) envia o formulário; (5) cliente valida presença dos campos; (6) botão entra em estado de processamento; (7) a aplicação chama `supabase.auth.signInWithPassword`; (8) Supabase valida credenciais; (9) sessão é estabelecida pelo SDK; (10) interface apresenta confirmação; (11) usuário é redirecionado ao perfil. Em retorno de um checkout, a edição previamente escolhida é preservada.

**Pós-condições:** sucesso: sessão Supabase ativa; falha: sem mensagem de sucesso e usuário permanece na tela.

**Alternativos:** A1 campos vazios; A2 credenciais incorretas/e-mail não confirmado; A3 erro de rede ou configuração do Supabase. A aplicação apresenta mensagens sem revelar se determinado e-mail existe.

### Regras de negócio

| ID | Regra |
|---|---|
| RN-01 | E-mail e senha são obrigatórios. |
| RN-02 | A autenticação é delegada ao Supabase Auth. |
| RN-03 | Senhas não são consultadas ou comparadas por código do navegador. |
| RN-04 | Perfil e pedidos exigem usuário autenticado. |
| RN-05 | Logout chama `supabase.auth.signOut()` e limpa a sessão. |
| RN-06 | Mensagens de erro não exibem credenciais nem detalhes internos. |

### Requisitos não funcionais

| ID | Requisito | Verificação |
|---|---|---|
| RNF-01 | Senha nunca deve ser persistida no `localStorage` ou tabela de perfil. | Inspecionar chamadas/tabelas e armazenamento do navegador. |
| RNF-02 | Formulário responsivo e mensagens acessíveis por leitor de tela. | Validar em 320/1024 px e `aria-live`. |
| RNF-03 | Login, falha e logout devem concluir sem estado falso de sessão. | Login e logout foram verificados com conta de teste; ausência de sessão redireciona o perfil ao login. Login inválido ainda não foi demonstrado manualmente. |

## 4. Protótipo funcional (50%)

- Página: `paginas/login.html`.
- Implementação: `js/script.js` e `js/supabase-config.js`.
- Estados codificados: inicial, incompleto, processando, erro e sucesso/redirecionamento.
- Persistência de sessão: SDK Supabase Auth.
- Fluxo verificado no projeto Supabase de teste: cadastro e confirmação de e-mail foram registrados no histórico do projeto; login, logout, perfil e recuperação de senha foram confirmados pelo usuário. O site e a API ainda não foram publicados na Vercel; domínio de produção e conta pública de demonstração não foram definidos.

## 5. Arquitetura e ADR (15%)

```mermaid
flowchart LR
  U[Usuário] --> UI[login.html]
  UI --> JS[ES Module script.js]
  JS --> AUTH[Supabase Auth]
  AUTH --> JS
  JS --> P[perfil.html]
```

#### ADR-001 — Supabase Auth
- **Status:** Implementado e validado com contas de teste no projeto Supabase configurado localmente.
- **Contexto:** credenciais não devem ser comparadas no navegador.
- **Decisão:** autenticação pelo SDK oficial do Supabase.
- **Alternativas:** tabela própria de senhas em texto; backend próprio. A tabela própria insegura foi removida do fluxo.

#### ADR-002 — JavaScript ES Modules
- **Status:** Implementado.
- **Contexto:** cliente Supabase é importado como módulo.
- **Decisão:** carregar `script.js` com `type="module"`.
- **Alternativas:** script clássico com dependências globais; build bundler.

#### ADR-003 — Perfil separado das credenciais Auth
- **Status:** Perfil `public.profiles` implementado com RLS e gatilho de criação; edição do nome validada pelo usuário.
- **Contexto:** nome, foto e nível adquirido pertencem ao perfil; credenciais ficam sob gestão do Supabase Auth.
- **Decisão:** o cadastro envia `full_name` como metadado e o gatilho cria `profiles.user_name`; `user_foto` tem imagem padrão e `user_level` é atualizado por compras simuladas.
- **Alternativas:** armazenar senha junto aos dados do perfil; reutilizar a tabela legada `Usuario` para autenticação.

#### ADR-004 — Sessão mantida pelo SDK
- **Status:** Implementado pelo SDK.
- **Contexto:** identificadores arbitrários em `localStorage` não provam login.
- **Decisão:** consultar sessão/usuário por `supabase.auth` e sair pelo SDK.
- **Alternativas:** usar e-mail do usuário como chave de login local; não adotada.

## 6. Segurança OWASP (12%)

| Risco | Controle no código | Teste requerido |
|---|---|---|
| A07 — Authentication Failures | Supabase Auth valida credenciais e mantém a sessão; mensagens do cliente não revelam erros brutos. | Login e logout reais, cadastro e confirmação de e-mail e recuperação de senha foram validados. Tentativa com senha incorreta não foi demonstrada manualmente. |
| A01 — Broken Access Control | API autentica o bearer token e consulta o perfil vinculado ao usuário; RLS separa linhas por `auth.uid()`. | Perfil sem sessão redireciona ao login; integração real de duas contas validou isolamento de dados. |
| A02 — Cryptographic Failures | A aplicação não consulta nem armazena senha na tabela de perfil ou no `localStorage`; Auth gerencia credenciais. | Revisão do cliente/schema e teste real de redefinição concluídos; a tabela legada permanece fora do fluxo de autenticação web. |

As confirmações manuais e testes foram registrados em `contexto-backup.md`. Não há pacote de screenshots/relatório de evidências anexado a este documento; a revisão responsiva e de teclado permanece pendente.

## Checklist

- [x] Código de login usa Supabase Auth; não consulta `senha_usuario`.
- [x] Há estados de processamento e mensagens de falha/sucesso.
- [x] Validar cadastro e confirmação de e-mail, login/logout, sessão de perfil e recuperação de senha no projeto Supabase real com contas de teste.
- [ ] Demonstrar a 320 px/1024 px e anexar evidência.
- [ ] Publicar site e API integrados na Vercel e disponibilizar conta de teste apropriada.
- [ ] Executar e documentar testes de segurança.

**Fontes:** documentos do professor fornecidos, requisitos v15 e arquivos do projeto. A documentação descreve o estado local do código; não atesta comportamento no Supabase remoto.
