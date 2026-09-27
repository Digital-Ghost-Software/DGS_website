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
- O usuário confirmou que as consultas estruturais retornaram como esperado: existem `profiles`, `admin`, `simulated_payments` e `game_downloads`, todas com RLS ativo; contagem de policies: 2, 0, 2 e 2, respectivamente. Nenhum dado de produção foi inserido nesta etapa.
- `.env` não foi alterado nesta etapa.
- O site ainda não é compatível com o novo schema: a criação de pedido ainda não envia `payment_method` e o formato esperado do perfil precisa ser adaptado. Não apontar o site para o banco novo antes de uma etapa de adaptação e testes.
- O schema e o guia foram aprovados em 26/09/2026 e commitados como `Cria schema inicial do novo Supabase`. O projeto foi criado pelo usuário e a migração foi executada e estruturalmente verificada em 26/09/2026.
- Na ocasião anterior, o usuário pediu excepcionalmente que apenas o registro de progresso fosse salvo sem commit. As etapas aprovadas seguintes seguem a regra normal de commit em português.
- Preservar alterações preexistentes do usuário: `.env.example` consta como removido (o usuário renomeou para `.env`) e `Docs/requisitos/RF - 01 - Login.md` consta como arquivo não rastreado/desconhecido. Não incluí-los em commits sem autorização.

### Próximo ponto ao retomar

1. Próxima etapa: criar a conta pessoal do usuário em **Authentication → Users** no projeto `DGS_Web_Site` e inseri-la na tabela `admin` pelo SQL Editor, conforme o guia. Confirmar o resultado antes de avançar.
2. Depois, configurar credenciais locais do projeto novo (sem compartilhá-las pelo chat) e adaptar/testar a aplicação para `profiles` e `payment_method`. Não apontar o site ao banco novo antes de essa adaptação ser aprovada.
3. Validar autenticação, criação automática de perfil, nível de compra, formas de pagamento e isolamento RLS com testes de integração no projeto novo.

### Registro da etapa aprovada

| Data | Etapa | Alterações/verificações | Aprovação |
|---|---|---|---|
| 26/09/2026 | Schema inicial do Supabase novo | Criado `database/ddl/new-project-schema.sql`, guia `Docs/banco-supabase-proprio.md` e testes estáticos da migração. `npm test`: 29 aprovados, 0 falhas e 1 teste remoto ignorado; build e `git diff --check` aprovados. Commit `Cria schema inicial do novo Supabase`. | Aprovada pelo usuário. |
| 26/09/2026 | Criação e verificação estrutural do novo banco | Usuário criou `DGS_Web_Site`, aplicou o schema aprovado e confirmou quatro tabelas com RLS ativo e policies nos totais esperados (2/0/2/2). Banco antigo não foi alterado. | Aplicação e consulta de verificação confirmadas pelo usuário. |
