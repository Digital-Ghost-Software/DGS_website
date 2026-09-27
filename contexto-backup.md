# Backup de contexto e plano de ação

Última atualização: 25/09/2026

Este arquivo preserva o contexto de trabalho, as decisões confirmadas, o que já foi preparado e a sequência pendente. Atualizar ao concluir com sucesso e obter aprovação do usuário em cada etapa.

## Objetivo

Continuar no fork local `Digital-Web-Site` o refinamento geral do projeto estudantil Digital Ghost Software — Yokai Tales, com foco em RF-004 (gestão de pagamentos simulados) e preparação integrada para Vercel. A branch de trabalho é `main` neste fork; trabalhar nela, conforme confirmação explícita do usuário.

## Regras de trabalho confirmadas

- Trabalhar **um passo por vez**.
- Aplicar testes unitários e de integração em cada passo, incluindo regressões dos requisitos anteriores quando aplicável.
- Ao concluir um passo, apresentar alterações e resultados de teste ao usuário e aguardar aprovação antes de avançar.
- O usuário atua como agente verificador; não presumir aprovação pelo silêncio.
- Se houver dúvida, falta de contexto ou incoerência, parar e perguntar antes da ação dependente.
- Antes de qualquer etapa que dependa do Supabase/banco, solicitar as informações pendentes. Nunca pedir que segredos sejam enviados pelo chat.
- Não executar migração remota, publicar deploy, fazer push nem alterar dados externos sem autorização específica e acesso apropriado.
- Não usar ou apresentar como requisito textos genéricos/exemplos dos documentos-fonte (por exemplo, hotelaria) que não pertençam ao Yokai Tales.
- Não declarar como realizados deploy, execução remota de SQL, testes reais no Supabase ou publicação do jogo sem evidência.
- Depois de cada etapa bem-sucedida e aprovada, atualizar este arquivo com a decisão, mudanças e testes correspondentes.
- Depois de cada etapa concluída, criar um commit com mensagem clara, objetiva e em português. Se os limites entre etapas anteriores puderem ser separados sem risco, criar commits retroativos por etapa; caso contrário, agrupar as mudanças já aprovadas em commits coerentes. Nunca incluir alterações do usuário sem autorização ou presumir autoria de arquivos desconhecidos.

## Decisões confirmadas pelo usuário

- Supabase é o banco/autenticação existentes; Node.js é obrigatório.
- O checkout é uma simulação acadêmica, sem cobrança real, gateway, dados de cartão ou CVV.
- Standard custa R$ 20,00; Plus custa R$ 40,00 e inclui conteúdo adicional/DLC.
- O download só poderá funcionar quando houver arquivo/release e URL reais; não inventar endereço.
- Preservar e bloquear para acesso web os dados legados; não apagar nem migrar sem nova decisão.
- A URL base do Supabase configurada no projeto é `https://thmtriwgvsgxdinsuxph.supabase.co`; não usar `/rest/v1/` como base.
- A chave pública/publicável já está configurada no cliente. A chave service-role/secret não está disponível ao usuário; nunca solicitar que seja colada no chat. Um administrador pode inseri-la diretamente como variável sensível no servidor/Vercel.
- Destino previsto para publicação: Vercel, frontend e API na mesma origem. Deploy ainda não realizado.
- A exceção de idioma autorizada é específica: em `index.html`, podem permanecer “Download” e o texto “Lorem ipsum”. Nas demais páginas, alertas, diálogos, notificações e demais mensagens ao usuário devem estar em português brasileiro. Nomes de edição Standard/Plus são nomes do produto.

## Trabalho concluído e aprovado até aqui

### Preparação técnica e estrutura do projeto

- Branch local está em `main`; HEAD observado: `1dc5873` (`Optimize branch for integrated Vercel deployment`). O repositório mantém histórico remoto como referência, mas as alterações atuais ainda não foram commitadas.
- Node portátil foi removido e Node.js 22 instalado pelo instalador padrão do sistema (versão verificada anteriormente: 22.23.3).
- Corrigida/diagnosticada a questão do caminho do npm: Node/npm instalados globalmente; `npm.cmd` funciona no ambiente de trabalho. O `npm` via PowerShell pode ter diferenças de acesso do sandbox à instalação de usuário, conforme registrado na conversa; usar os comandos já verificados sem alterar configurações globais sem necessidade.
- Dependências instaladas com `npm.cmd ci`; nenhum alerta de vulnerabilidade foi reportado naquela execução.
- Projeto possui preparação Vercel, API Node compartilhada, build estático isolado e scripts de teste.

### Código, testes e idioma

- Testes unitários e integração HTTP local com Supabase simulado estão configurados.
- Cobertura existente contempla regras de autenticação/cadastro, compra, download, endpoints API, isolamento de dados por token, validação de edição, origem e exclusão de conta.
- Foi feita auditoria das mensagens visíveis. Rótulos de navegação e mensagens do site foram localizados para pt-BR; cadastro/alteração não exibem mensagens brutas do Supabase.
- Exceção de idioma aplicada: `index.html` mantém “Download” e “Lorem ipsum”, conforme pedido posterior.
- Testes verificados após ajuste de idioma: `npm.cmd test` — 23 testes passaram, 0 falharam. `git diff --check` passou. Build estático também passou em execução anterior a esse ajuste pontual de idioma.
- Há alterações locais pendentes na documentação, interface, lógica, servidor e testes. Consultar `git status` antes de editar; preservar todas as alterações.

## Ponto atual

O usuário informou que executou `database/ddl/rf-004-simulated-payments.sql` no Supabase e recebeu `Success. No rows returned.` As quatro capturas confirmam: `simulated_payments` e `game_downloads` com RLS ativo; as tabelas legadas `Usuario`, `Cartao` e `Administrador` também com RLS ativo; quatro policies de leitura/inserção para `authenticated`; dois triggers `BEFORE INSERT`; e somente `SELECT`/`INSERT` concedidos ao papel `authenticated`, sem grants listados para papéis web nas tabelas legadas. `FORCE ROW LEVEL SECURITY` aparece false, mas o RLS está ativo e a migração não exige FORCE.

O teste real `npm.cmd run test:integration:supabase` passou duas vezes com duas contas criadas em Supabase Auth. Validou autenticação, perfil pela API com token válido, rejeição do perfil sem token (401), preços, titularidade, isolamento de leitura entre contas, download próprio, rejeição de download alheio e logout com sessões encerradas. Cada execução acrescentou dois pedidos simulados e um registro de download; no total conhecido do harness são quatro pedidos e dois downloads de teste permanentes. A regressão local `npm.cmd test` teve 27 aprovados, 0 falhas e 1 teste remoto ignorado (executado separadamente); `git diff --check` passou. O projeto já usa Supabase Auth no cadastro e login; as contas antigas da tabela `Usuario` permanecem preservadas e bloqueadas para acesso web.

Não solicitar credenciais ou chaves secretas. A chave publicável e URL REST foram recebidas na conversa; a URL base é sem `/rest/v1/`. A chave publicável não autoriza execução DDL pela API.

## Plano de ação restante

Seguir um item por vez, adaptando o escopo ao estado atual e pedindo aprovação após cada etapa:

1. **Validar cadastro real pelo formulário**: o código chama `supabase.auth.signUp`, mas ainda falta confirmar um cadastro de teste pela interface e validar confirmação de e-mail conforme a configuração do projeto.
2. **Completar testes funcionais com Auth**: verificar interface de login, logout e perfil, alteração de nome/senha e histórico; exclusão própria depende de configuração administrativa server-side.
3. **Tratar a transição das contas legadas**: preservar a tabela `Usuario` bloqueada. O usuário declarou que os perfis dos prints são dados fictícios de teste e autorizou reaproveitar os respectivos e-mails, nomes e senhas na criação de contas de teste no Auth; não incluir esses valores em arquivos, commits ou mensagens.
4. **Revalidar configuração de Auth**: confirmação de e-mail, URLs de retorno e mensagens para usuário, após domínio de deploy ser conhecido. Antes disso, não inventar domínio.
5. **Preparar/publicar API e site na Vercel**: revisar guia e configuração, obter aprovação específica para publicação; seguir as instruções de deploy. Secret de service role, se necessária para exclusão, deve ser configurada pelo administrador diretamente no ambiente Vercel.
6. **Executar testes de segurança e regressão**: adulteração de preço/titular/status, RLS, origem e demais requisitos RF-001 a RF-004. Preservar evidências sem dados pessoais ou segredos.
7. **Download real**: permanece aguardando publicação do binário/release e URL fornecidos pelo usuário. Até lá manter a indicação de pendência e testar apenas o estado desabilitado.
8. **Atualizar documentação e relatório final**: refletir somente fatos demonstrados; registrar pendências externas, evidências disponíveis e próximas ações.

## Pendências conhecidas / limites

- Execução da migração RF-004 foi confirmada pelo usuário sem erro reportado; capturas validaram tabelas, RLS, policies, triggers e grants. O teste real de comportamento/RLS entre duas contas passou.
- Supabase Auth e perfil/logout reais foram validados pelo harness; cadastro pela interface, confirmação de e-mail e fluxos visuais ainda aguardam teste funcional dedicado.
- Deploy Vercel ainda não foi feito e não há URL atribuída.
- A chave service-role não está disponível ao usuário; a exclusão de conta fica indisponível até configuração server-side por administrador.
- Release/binário e URL de download não existem no contexto atual.
- Testes reais de Auth, duas contas, RLS e evidências de segurança/demonstração seguem pendentes.

## Registro de etapas aprovadas

| Data | Etapa | Alterações/verificações | Aprovação |
|---|---|---|---|
| 24/09/2026 | Auditoria de idioma da interface | Textos pt-BR; exceções “Download” e “Lorem ipsum” em `index.html`; 23 testes passaram; `git diff --check` passou. | Aprovada com exceção de idioma pelo usuário. |
| 25/09/2026 | Backup de contexto e política de commits | Atualizado conforme pedido do usuário para registrar commits em português por etapa e recuperar commits anteriores quando seguro. | Autorizado pelo pedido explícito do usuário. |
| 25/09/2026 | Registro dos passos anteriores no Git | `b596814` (`Conclui refinamento RF-004 com testes automatizados`) agrupa as alterações aprovadas de refinamento, localização, documentação e testes; `f4069dd` (`Registra contexto e regra de commits por etapa`) registra este backup e a política solicitada. Suíte: 23 testes aprovados; build estático e `git diff --check` aprovados. | Commits autorizados explicitamente pelo usuário. |
| 25/09/2026 | Aplicação da migração RF-004 | Usuário executou `database/ddl/rf-004-simulated-payments.sql`; retorno informado: `Success. No rows returned.` Consultas seguintes confirmaram tabelas, RLS, policies, triggers e grants. | Execução e verificação estrutural confirmadas; testes de comportamento ainda pendentes. |
| 25/09/2026 | Verificação de estrutura e permissões RF-004 | Capturas confirmam tabelas/RLS, quatro policies, dois triggers e grants `SELECT`/`INSERT`; quatro testes locais verificam os requisitos declarados no SQL. | Resultados enviados pelo usuário; estrutura validada. Comportamento real ainda pendente. |
| 25/09/2026 | Harness para integração Supabase real | Criado teste opt-in para preços/titularidade, RLS entre duas contas e download próprio/alheio; credenciais apenas locais; dados simulados criados pelo teste permanecem no banco. | Alterações aprovadas pelo usuário. |
| 25/09/2026 | Teste real RF-004 com Supabase Auth | Duas contas Auth de teste autenticaram; teste remoto aprovou preços, titularidade, isolamento entre contas e validação de downloads. Criados dois pedidos simulados e um download. `npm test`: 27 aprovados, 1 ignorado; `git diff --check` aprovado. Diagnósticos de autenticação passaram a mostrar apenas status HTTP e código. | Resultado e alteração de diagnóstico aprovados pelo usuário. |
| 25/09/2026 | Testes reais de perfil e logout | Teste remoto verificou `GET /api/profile` com token (200, identidade correta), sem token (401), logout das duas contas e sessões encerradas; as verificações RF-004 permaneceram aprovadas. Mais dois pedidos simulados e um download foram criados. `npm test`: 27 aprovados, 1 remoto ignorado; `git diff --check` aprovado. | Resultados e alteração do teste aprovados pelo usuário. |

## Retomada — 26/09/2026 (etapa aprovada)

O usuário confirmou as duas decisões pendentes para o novo banco: o e-mail será mantido no Supabase Auth e retornado pela API; `user_level` começa nulo, muda para `standard` ou `plus` conforme a compra, e `plus` prevalece. Também confirmou que será o único administrador, criando eventuais outros pelo painel.

### Preparado nesta etapa

- Criado `database/ddl/new-project-schema.sql`, separado da migração já aplicada no Supabase antigo. Define `profiles` vinculado a `auth.users`, tabela `admin` sem escrita pelo cliente, `simulated_payments` com forma de pagamento (`boleto`, `credito`, `debito`, `pix`) e `game_downloads`; políticas RLS, triggers de perfil/pedido/download e preços de R$ 20/40.
- Criado `Docs/banco-supabase-proprio.md` com instruções para criar um projeto Supabase novo, aplicar o SQL pelo SQL Editor, criar a conta do usuário e conceder a ela o registro administrativo, e conferir estrutura/RLS.
- Adicionados testes estáticos da migração nova em `tests/unit/migration.test.js`.
- Verificação local: `npm.cmd test` — 29 passaram, 0 falharam, 1 teste de Supabase real ignorado; `npm.cmd run build` passou; `git diff --check` passou.

### Estado externo e limites

- O usuário criou o projeto Supabase `DGS_Web_Site` e executou nele `database/ddl/new-project-schema.sql`.
- O usuário confirmou que as consultas estruturais retornaram como esperado: existem `profiles`, `admin`, `simulated_payments` e `game_downloads`, todas com RLS ativo; contagem de policies: 2, 0, 2 e 2, respectivamente.
- O usuário criou sua conta no Auth de `DGS_Web_Site`, adicionou-a à tabela `admin` e confirmou `total_administradores = 1`. O e-mail e demais dados da conta não foram registrados aqui.
- `.env` não foi alterado nesta etapa.
- O perfil e o checkout foram adaptados no código ao schema novo e aprovados pelo usuário em 26/09/2026. A configuração ainda aponta para o projeto antigo no cliente (`js/supabase-config.js`); não executar o fluxo do site contra o banco novo antes da etapa de configuração.
- O schema e o guia foram aprovados em 26/09/2026 e commitados como `Cria schema inicial do novo Supabase`. O projeto foi criado pelo usuário e a migração foi executada e estruturalmente verificada em 26/09/2026.
- Na ocasião anterior, o usuário pediu excepcionalmente que apenas o registro de progresso fosse salvo sem commit. As etapas aprovadas seguintes seguem a regra normal de commit em português.
- `.env.example` foi removido e a exclusão foi autorizada pelo usuário; o arquivo `.env` local contém configuração privada e nunca deve ser commitado. Preservar `Docs/requisitos/RF - 01 - Login.md`, que continua não rastreado/desconhecido e fora do escopo.

### Próximo ponto ao retomar

1. Configuração do `DGS_Web_Site` no `.env` local concluída pelo usuário; não ler nem revelar esses valores. Servidor local em `http://localhost:3000/`.
2. Integração real aprovada: Auth, perfil, preços, compras, nível Plus, RLS e downloads passaram; foram persistidos 6 pedidos de teste e 1 download nas duas contas descartáveis.
3. Validação visual encontrou bloqueio de perfil. Foi corrigido o protocolo padrão da checagem de mesma origem para requisições locais HTTP; teste de integração reproduzindo `Origin` local sem cabeçalhos de proxy passou. O navegador ainda redireciona ao login: a sessão mostra botão “Sair”, mas a API responde 401 para o token, indicando sessão antiga ou de outro projeto. O usuário aprovou a correção e o tratamento de falhas não autenticadas.
4. O diagnóstico aprovado diferenciou ausência de bearer (`missing_bearer_token`) de token rejeitado (`invalid_session`); a tentativa do navegador é a segunda. Próxima ação: encerrar a sessão visível pelo botão “Sair” e solicitar que o usuário entre novamente com a conta A criada no Auth do projeto `DGS_Web_Site`; então validar perfil. Depois, testar edição de nome e logout pela interface. Não solicitar senha no chat.

### Registro da etapa aprovada

| Data | Etapa | Alterações/verificações | Aprovação |
|---|---|---|---|
| 26/09/2026 | Schema inicial do Supabase novo | Criado `database/ddl/new-project-schema.sql`, guia `Docs/banco-supabase-proprio.md` e testes estáticos da migração. `npm test`: 29 aprovados, 0 falhas e 1 teste remoto ignorado; build e `git diff --check` aprovados. Commit `Cria schema inicial do novo Supabase`. | Aprovada pelo usuário. |
| 26/09/2026 | Criação e verificação estrutural do novo banco | Usuário criou `DGS_Web_Site`, aplicou o schema aprovado e confirmou quatro tabelas com RLS ativo e policies nos totais esperados (2/0/2/2). Banco antigo não foi alterado. | Aplicação e consulta de verificação confirmadas pelo usuário. |
| 26/09/2026 | Conta Auth e primeiro administrador | Usuário criou a conta no Supabase Auth, inseriu o próprio usuário em `public.admin` e confirmou consulta com total igual a 1. Nenhuma credencial ou dado pessoal registrado. | Resultado confirmado pelo usuário. |
| 26/09/2026 | Adaptação do perfil e checkout ao schema novo | API consulta/atualiza `profiles`, exibe nível de usuário e aceita forma simulada boleto/crédito/débito/Pix em pedidos e histórico. Teste de integração local cobre validação e isolamento; teste live atualizado. `npm test`: 31 aprovados, 0 falhas, 1 teste remoto ignorado; build e `git diff --check` aprovados. Configuração não foi trocada e integração live no banco novo continua pendente. | Aprovada pelo usuário; commit `Adapta perfil e checkout ao novo schema`. |
| 26/09/2026 | Configuração pública por ambiente e servidor local integrado | Removida URL/chave hardcoded do frontend; `/api/config` expõe somente URL e chave publicável. `npm start` passa a servir páginas e API na mesma origem e nega `.env`/fontes privados. Testes cobrem configuração, ausência de chave secreta na resposta e arquivos estáticos; `npm test`: 35 aprovados, 0 falhas, 1 teste remoto ignorado; build e `git diff --check` aprovados. Credenciais do novo projeto ainda não configuradas; nenhuma integração live executada. | Aprovada pelo usuário; commit `Configura Supabase por ambiente e serve site local`. |
| 26/09/2026 | Remoção do exemplo local de ambiente | `.env.example` removido do controle de versão conforme autorização explícita do usuário. O arquivo real `.env` permanece local e não deve ser commitado; o arquivo de requisitos RF-001 preexistente permaneceu fora do commit. | Exclusão autorizada pelo usuário. |
| 26/09/2026 | Integração real com o novo Supabase | Primeira tentativa autenticou as duas contas e persistiu 3 pedidos de teste, mas falhou devido a um filtro incompleto no teste; nenhum download foi criado nessa tentativa. Corrigido o filtro para incluir os pedidos A Standard, A Plus e B Plus. Suíte local: 35 aprovados, 0 falhas, 1 integração remota ignorada; build e `git diff --check` aprovados. Nova execução live aprovada: 1 teste aprovado, 0 falhas, verificando perfil autenticado/anônimo, titularidade, valores R$ 20/R$ 40, método, status simulado, nível Plus prevalente, isolamento RLS, download próprio e bloqueio de download alheio. Cada execução cria pedidos Standard e Plus para a conta A e um pedido Plus para a conta B, verificando que A não lê o pedido de B e vice-versa. A segunda execução adicionou mais 3 pedidos e 1 download; total desta etapa: 6 pedidos de teste (incluindo 2 Plus da conta B) e 1 download persistidos nas contas descartáveis. | Correção e nova execução aprovadas pelo usuário; teste live aprovado. |
| 26/09/2026 | Correção da origem local e tratamento de falha ao carregar perfil | Corrigido o protocolo padrão da API para coincidir com HTTP local quando não há proxy; teste de integração garante acesso pela origem `http://<host>` sem cabeçalhos de proxy. Frontend agora redireciona ao login apenas para HTTP 401 e apresenta mensagem pt-BR para outras falhas, registrando apenas status no console. `npm test`: 37 aprovados, 0 falhas, 1 teste live ignorado; build e `git diff --check` aprovados. Teste no navegador ainda falha: conta mantém botão “Sair”, perfil é redirecionado, portanto é necessário renovar a sessão/confirmar conta do projeto antes de concluir. | Alterações aprovadas pelo usuário; validação visual do perfil pendente. |
| 26/09/2026 | Diagnóstico do redirecionamento e auditoria de cópias | Confirmado que `paginas/perfil.html` e `paginas/login.html` servem com HTTP 200 e os links relativos resolvem corretamente; `/api/health` aceita a origem local. Console revela resposta 401 com código sanitizado `invalid_session`, distinguindo-a de bearer ausente. `dist/` é gerada por `scripts/build-static.js`, ignorada pelo Git e usada pela Vercel; duplicatas vistas são artefatos de build, sem cópias idênticas fora de `dist`. Testes: 37 aprovados, 0 falhas, 1 teste live ignorado; build e `git diff --check` aprovados. | Diagnóstico e testes aprovados pelo usuário; nova autenticação da conta descartável pendente. |
