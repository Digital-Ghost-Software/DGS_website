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
3. Validação visual encontrou bloqueio de perfil. Foi corrigido o protocolo padrão da checagem de mesma origem para requisições locais HTTP; teste de integração reproduzindo `Origin` local sem cabeçalhos de proxy passou. O navegador ainda redirecionava ao login. Diagnóstico posterior identificou que o servidor local iniciado no ambiente restrito não conseguia alcançar o Supabase (status Auth 0); iniciado com acesso de rede, uma sessão nova foi aceita e o perfil carregou corretamente. O emissor e expiração dos tokens foram classificados apenas como diagnóstico, sem validar assinatura.
4. Resultado confirmado pelo usuário e agente: conta de teste A autenticou novamente na interface; `/api/profile` carregou o perfil, e o navegador permaneceu em `paginas/perfil.html`. Um teste SDK separado autenticou e chamou o endpoint local com token válido (HTTP 200). Não houve alterações em pedidos, downloads ou perfil nesta validação. Ao testar localmente, iniciar `npm start` com acesso de rede ao Supabase no ambiente atual; não é necessária alteração de configuração do projeto por causa desse erro. Próxima ação: retomar a validação de cadastro pela interface, um passo por vez.
5. Edição de nome pela interface concluída: o nome foi temporariamente alterado, persistiu ao sair e retornar ao perfil, depois foi restaurado ao valor original e confirmado novamente após nova leitura. Logout também concluído: a sessão foi encerrada e o botão “Sair” sumiu; abrir “Perfil” sem sessão inicialmente não redirecionava porque o cliente não atribuía status/código ao erro de bearer ausente. Corrigido o código para marcar `missing_bearer_token` e classificar esse erro como redirecionamento para login. Após recarregar, abrir “Perfil” sem sessão redirecionou a `paginas/login.html`. Correção commitada e suíte local aprovada.
6. Decisão do usuário para cadastro: manter o comportamento padrão do Supabase; criar a conta/perfil no cadastro e exigir confirmação do e-mail antes do primeiro acesso. O formulário foi submetido com endereço de teste; a interface retornou “Conta criada. Confirme o e-mail antes de entrar.”. O link compartilhado depois pelo usuário foi comparado sem usar seu token: o hostname corresponde ao Supabase configurado em `.env` e o retorno é para o login local. Usuário informou que concluiu a confirmação. O perfil deve ter sido criado pelo gatilho de `auth.users`; ainda falta validar o login/leitura do perfil. A senha descartável gerada no cadastro não está disponível para reutilização e não foi registrada em arquivo.

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
| 26/09/2026 | Encerramento da sessão antiga | A sessão que continuava visível na interface foi encerrada pelo botão “Sair”; a aba retornou ao login e o botão desapareceu. Nenhum registro do banco foi alterado. | Feito durante o diagnóstico aprovado; novo login da conta descartável pendente. |
| 26/09/2026 | Diagnóstico concluído e perfil validado | O servidor iniciado sem acesso de rede não conseguia validar sessões (Auth status 0). Com o servidor local autorizado a acessar o Supabase, o login novo foi aceito e o perfil carregou na interface; teste SDK local autenticou e obteve HTTP 200 do perfil. Nenhum pedido, download ou dado de perfil foi alterado. Diagnóstico registra apenas estado HTTP e classificação não verificada de emissor/expiração. `npm test`: 41 aprovados, 0 falhas, 1 teste remoto ignorado; build e `git diff --check` aprovados. | Alterações de diagnóstico e validação com conta descartável aprovadas pelo usuário. |
| 26/09/2026 | Edição de nome do perfil | Pela interface, o nome da conta descartável foi alterado temporariamente; a mensagem “Nome atualizado” apareceu e o nome persistiu ao navegar e carregar novamente o perfil. Em seguida, o nome original foi restaurado e confirmado após nova leitura. Pedidos e downloads não foram alterados. `npm test`: 41 aprovados, 0 falhas, 1 teste remoto ignorado; `git diff --check` aprovado. | Passo autorizado pelo usuário; resultado pronto para aprovação antes do teste de logout. |
| 26/09/2026 | Logout e proteção de perfil sem sessão | Logout da interface encerrou a sessão e removeu o botão “Sair”. O teste seguinte revelou que o perfil ficava aberto quando não havia token, pois o cliente lançava erro sem código de autenticação. Corrigido para identificar `missing_bearer_token` como não autenticado e redirecionar ao login; validado no navegador. Teste unitário incluído. `npm test`: 41 aprovados, 0 falhas, 1 teste remoto ignorado; build e `git diff --check` aprovados. | Etapa de logout previamente aprovada pelo usuário; correção necessária para o fluxo passar. |
| 26/09/2026 | Cadastro pela interface — conta criada, confirmação pendente | O usuário escolheu manter o padrão de confirmação de e-mail do Supabase e forneceu um endereço de teste acessível. O cadastro feito no formulário foi aceito e a interface pediu confirmação. O schema cria o perfil no gatilho de inserção de usuário Auth; falta confirmar o e-mail e validar login/perfil. Nenhum endereço ou senha foi gravado neste arquivo. Antes do cadastro, `npm test`: 41 aprovados, 0 falhas, 1 teste remoto ignorado; `git diff --check` aprovado. | Cadastro aprovado pelo usuário; confirmação no e-mail é necessária para concluir validação funcional. |
| 26/09/2026 | Confirmação do e-mail do cadastro de teste | Usuário informou que concluiu a confirmação. O hostname do link apresentado foi comparado ao projeto configurado, sem abrir nem registrar token; ambos coincidem e o redirect configurado volta ao login local. Testes locais: 41 aprovados, 0 falhas, 1 integração remota ignorada; `git diff --check` aprovado. Para verificar login e perfil, usuário precisa definir uma nova senha pelo fluxo de recuperação do Supabase, pois o site não implementa recuperação e a senha descartável do cadastro não está disponível para reutilização. O token do link não foi copiado para este backup. | Confirmação do e-mail relatada pelo usuário; comparação do projeto verificada. |

## Retomada — 27/09/2026: recuperação de senha

- A decisão aprovada pelo usuário é uma única página `paginas/recuperar-senha.html` com dois estados: solicitar o e-mail e, ao retornar pelo link de recuperação do Supabase, cadastrar/confirmar uma nova senha.
- O pop-up de troca de senha do perfil permanece separado, pois depende de uma sessão autenticada e representa alteração de senha dentro da conta.
- A implementação chama `resetPasswordForEmail` com retorno à própria página e `updateUser` para salvar a senha. O link de recuperação foi adicionado ao login e o guia de deploy documenta as Redirect URLs para localhost e produção.
- Testes cobrem a URL de retorno, a presença dos dois formulários, localização pt-BR e entrega da página pelo servidor. Verificação antes do commit: `npm.cmd test` — 42 passaram, 0 falharam, 1 teste live do Supabase ignorado; build e `git diff --check` passaram. Commit `Implementa recuperação de senha em página única`.
- Correção visual: o seletor `form { display: flex; }` sobrepunha o comportamento padrão do atributo HTML `hidden`. Foi adicionada uma regra específica para manter oculto o formulário de nova senha fora do retorno do link. A captura do usuário após essa correção mostra apenas o formulário de solicitação.
- Diagnóstico do envio real: usuário forneceu `HTTP 429` e `over_email_send_rate_limit`. O endpoint do projeto Supabase foi chamado com a URL de retorno configurada; o limite de envio por e-mail foi atingido. A aplicação registra localmente somente status/código sanitizados. A suíte atual passou com 44 aprovados, 0 falhas e 1 teste remoto ignorado; build e `git diff --check` passaram.
- O usuário autorizou continuar e fará a validação do link recebido por e-mail em outro momento. O teste e-mail → estado de nova senha → login permanece pendente por causa do rate limit, não sendo considerado falha de implementação.
- Preservar a edição preexistente do usuário em `index.html` (“Comprar”) e `Docs/requisitos/RF - 01 - Login.md`, que permanece não rastreado e fora do escopo deste commit.
- A navegação que oculta “Entrar” quando a sessão está autenticada foi concluída e verificada separadamente; detalhes registrados abaixo.

| Data | Etapa | Alterações/verificações | Aprovação |
|---|---|---|---|
| 27/09/2026 | Recuperação de senha em página de dois estados | Implementados solicitação e redefinição na mesma página, retorno explícito do Supabase, link no login, documentação de Redirect URLs e testes unitários/de integração. `npm.cmd test`: 42 aprovados, 0 falhas, 1 teste live ignorado; build e `git diff --check` aprovados. Commit `Implementa recuperação de senha em página única`. | Aprovada pelo usuário. |
| 27/09/2026 | Correção da exibição dos estados e diagnóstico do rate limit | Corrigido CSS para respeitar `hidden`; testes de unidade/integração cobrem markup e regra CSS. Adicionado diagnóstico restrito a status HTTP/código Supabase, sem logar mensagem bruta, e testes de sanitização. `npm.cmd test`: 44 aprovados, 0 falhas, 1 teste live ignorado; build e `git diff --check` aprovados. Usuário confirmou o 429 `over_email_send_rate_limit` e optou por validar o e-mail depois. | Usuário autorizou prosseguir; validação externa do e-mail pendente. |

## Etapa aprovada — navegação conforme sessão autenticada (27/09/2026)

- A navegação agora oculta “Entrar” e mostra “Sair” quando o Supabase retorna uma sessão autenticada. Sem sessão, ou se a verificação falhar, deixa “Entrar” visível e mantém “Sair” oculto.
- A regra foi extraída para `getNavigationState` e coberta por teste unitário em ambos os estados. Teste de integração confirma que as páginas inicial e de login servem os controles usados pela lógica.
- Verificação: `npm.cmd test` — 43 aprovados, 0 falhas e 1 teste live do Supabase ignorado; `npm.cmd run build` e `git diff --check` aprovados.
- Usuário aprovou as alterações. Commit desta etapa: `Oculta entrada quando a sessão está autenticada`.
- Próximo passo funcional ainda deve ser proposto e aprovado separadamente; não foi iniciado nesta etapa.

### Verificação manual da navegação

- Em 27/09/2026, o usuário confirmou que, autenticado na página de perfil em `http://localhost:3000/paginas/perfil.html`, a navegação está funcionando. Isso conclui a verificação visual da etapa de ocultar “Entrar”.
- Próximo passo: validar ponta a ponta o link de recuperação no novo projeto Supabase. O usuário confirmou que já adicionou `http://localhost:3000/paginas/recuperar-senha.html` em Authentication → URL Configuration → Redirect URLs. Solicitar que ele teste o envio do link, o retorno à página no estado de nova senha e o login com a senha atualizada; não registrar e-mail, senha ou token.

## Etapa aprovada — foto padrão dos perfis (27/09/2026)

- `imagens/user-img-default.jpg` é a imagem padrão solicitada. O perfil exibe esse caminho quando `user_foto` estiver nulo/vazio e o HTML já inicia com a mesma imagem.
- O schema de instalação nova define `user_foto` como não nulo, com default `/imagens/user-img-default.jpg`; o gatilho Auth também atribui esse valor aos novos perfis.
- Criada a migração incremental `database/ddl/default-profile-photo.sql` para o projeto `DGS_Web_Site` existente. Conforme aprovação explícita, preenche fotos nulas dos perfis existentes, define o default/não nulo e atualiza o gatilho para novos usuários. **A migração ainda não foi executada pelo usuário no Supabase**; aguardar confirmação antes de afirmar que a foto persistida no banco está ativa.
- Testes: `npm.cmd run test:unit` — 32 aprovados; `npm.cmd run test:integration` — 18 aprovados; suíte completa — 50 aprovados, 0 falhas, 1 teste remoto ignorado. Build copiou a imagem para `dist/imagens/user-img-default.jpg`; `git diff --check` passou.
- Usuário aprovou a implementação e o backfill. Commit: `Define foto padrao para perfis`.
- A exclusão local de `imagens/626457731d0ab3dc14118c6c4f348661.jpg`, a alteração do usuário em `index.html` e o documento RF-001 não rastreado foram preservados fora do commit.
- Próximo passo: usuário executa `database/ddl/default-profile-photo.sql` no SQL Editor do projeto existente e informa o resultado. Depois validar no perfil e, quando o limite do Supabase permitir, concluir o fluxo de recuperação de senha por e-mail.

## Etapa aprovada — correção das instruções do README (27/09/2026)

- README atualizado para o projeto `DGS_Web_Site`: aponta para `new-project-schema.sql`, descreve `.env` local carregado pelo Node 22, instalação/testes, uso de `npm start`, configuração Auth e fluxo de recuperação; remove referências incorretas a `.env.example` e ao schema legado.
- Criado teste unitário que valida os passos atuais de configuração e os links locais do README; incluído no script `test:unit`.
- Verificações: 27 unitários e 18 de integração aprovados; suíte completa com 45 aprovados, 0 falhas e 1 teste remoto ignorado; build e `git diff --check` aprovados.
- Aprovado pelo usuário. Commit desta etapa será `Atualiza instrucoes do README para o Supabase atual`.
- A solicitação da foto padrão descrita acima foi concluída e incluída no commit `9f7f2bc`, junto com as alterações locais autorizadas pelo usuário.

## Atualização aprovada — migração da foto padrão no Supabase (27/09/2026)

- Usuário executou `database/ddl/default-profile-photo.sql` no SQL Editor do projeto `DGS_Web_Site` e confirmou sucesso.
- Regressão local: `npm.cmd test` — 50 aprovados, 0 falhas e 1 teste real do Supabase ignorado; `npm.cmd run build` passou; `git diff --check` passou.
- O teste live `npm.cmd run test:integration:supabase` passou com acesso de rede e confirmou login das duas contas de teste, perfil com `user_foto = /imagens/user-img-default.jpg`, preços, isolamento RLS e validação de download. A tentativa inicial sem rede retornou HTTP 0; a repetição autorizada com acesso de rede passou.
- O teste live criou três pedidos simulados (dois para a conta A e um para B) e um registro de download da conta A; a solicitação de download da conta B para o pedido da A foi rejeitada. São dados de teste nas contas descartáveis já autorizadas.
- Próximo passo: usuário recarrega `http://localhost:3000/paginas/perfil.html` e confirma visualmente a foto padrão no perfil. O fluxo de recuperação por e-mail permanece pendente de validação quando o limite de envio do Supabase permitir.
