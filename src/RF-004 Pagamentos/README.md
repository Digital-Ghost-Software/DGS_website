# Digital Ghost Software — Yokai Tales

Site acadêmico de apresentação do estúdio fictício Digital Ghost Software e do jogo Yokai Tales. O projeto usa HTML, CSS, JavaScript, Node.js, Supabase e Stripe Checkout em modo de teste. Não há cobrança real. O site não coleta nem persiste dados financeiros: os dados de pagamento são informados diretamente no Checkout hospedado da Stripe; no Supabase ficam somente os dados mínimos do pedido e seu estado.

## Funcionalidades no projeto

- Páginas de apresentação, cadastro, login, perfil e compra/download.
- Cadastro e autenticação com Supabase Auth.
- Recuperação de senha por e-mail em uma página com estados de solicitação e redefinição.
- Pedidos das edições Standard (R$ 20,00) e Plus (R$ 40,00) pelo Stripe Checkout em modo de teste, com cartão, Pix ou boleto.
- Registro/histórico de pedidos e solicitações de download no Supabase, limitados ao usuário autenticado por RLS.
- Troca de senha pela sessão autenticada.

## API Node.js

`server/index.js` verifica o bearer token do Supabase Auth. Rotas públicas: `GET /api/config`, `GET /api/health` e `POST /api/stripe/webhook`. Rotas autenticadas: `GET/PATCH /api/profile`, `GET/POST /api/payments`, `POST /api/downloads` e `POST /api/account/delete`. A criação do pedido usa uma chave administrativa exclusivamente no servidor; leitura de histórico usa o JWT do usuário e políticas RLS. O webhook valida a assinatura Stripe e atualiza o estado do pedido. `server/local.js` inicia o servidor HTTP local.

## Publicação

O repositório inclui a configuração para publicar site estático e API Node.js na Vercel. A configuração versionada está em `vercel.json`, `api/` e `scripts/build-static.js`; o projeto publicado usa a API na mesma origem. Configure no ambiente do servidor `SUPABASE_SECRET_KEY` (ou a chave legada `SUPABASE_SERVICE_ROLE_KEY`), `STRIPE_SECRET_KEY` (somente `sk_test_`), `STRIPE_WEBHOOK_SECRET` e `PUBLIC_APP_URL`, além da configuração pública Supabase. Nunca exponha essas chaves no navegador, Git ou chat. Configure no Stripe Dashboard um endpoint de webhook para `/api/stripe/webhook` e os eventos `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed` e `checkout.session.expired`.

## Configuração

1. Use o projeto Supabase `DGS_Web_Site` configurado para o trabalho em grupo. Para criar uma instalação nova aprovada pela equipe, aplique [`database/ddl/new-project-schema.sql`](database/ddl/new-project-schema.sql) no SQL Editor; não use a migração RF-004 do banco legado neste schema. Para atualizar a instalação atual, aplique [`database/ddl/stripe-test-checkout.sql`](database/ddl/stripe-test-checkout.sql) para permitir estados pendentes e atualizações administrativas verificadas; ela preserva os pedidos antigos. A migração incremental [`database/ddl/default-profile-photo.sql`](database/ddl/default-profile-photo.sql) cobre a foto padrão dos perfis.
2. Na raiz do projeto, crie um `.env` local (o arquivo é ignorado pelo Git) com `SUPABASE_URL` e `SUPABASE_PUBLISHABLE_KEY`. Use a URL base do projeto, sem `/rest/v1/`, e a chave publicável/anon. O servidor Node 22 carrega o arquivo local e `/api/config` entrega ao navegador somente esses valores públicos. Nunca coloque senha do banco, chave `service_role` ou chave secreta no frontend, repositório ou chat.
3. Instale dependências com Node.js 22.x usando `npm ci`. Execute `npm test` para a suíte completa ou `npm run test:unit` e `npm run test:integration` separadamente.
4. Habilite autenticação por e-mail no Supabase e defina confirmação de e-mail conforme a política do projeto. Em Authentication → URL Configuration, inclua `http://localhost:3000/paginas/login.html` e `http://localhost:3000/paginas/recuperar-senha.html` em Redirect URLs. A recuperação por e-mail usa a segunda rota para retornar ao estado de nova senha.
5. Inicie o site e API integrados com `npm start` e acesse `http://localhost:3000/`. Não abra as páginas como `file://` nem use outro servidor estático sem configurar também a API.
6. Para ativar o checkout, configure `SUPABASE_SECRET_KEY` (preferível; prefixo `sb_secret_`) ou a chave legada `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY` com chave de teste `sk_test_`, `STRIPE_WEBHOOK_SECRET` e `PUBLIC_APP_URL` no ambiente local e na Vercel. A chave Supabase secreta tem acesso administrativo e só deve ficar no servidor. Não use chave Stripe de produção. O Checkout hospedado recebe os dados financeiros diretamente; o Supabase guarda somente usuário, edição, valor, método, estado e data do pedido.
7. Habilite cartão, Pix e boleto no Stripe Dashboard de teste conforme disponibilidade da conta. Para pagamentos assíncronos, a confirmação depende do webhook; não considere o retorno do navegador como prova de pagamento.
8. Um arquivo público do jogo ainda não foi disponibilizado. Quando houver uma URL estável de release, configure `GAME_DOWNLOAD_URL` no ambiente do servidor; até lá o pedido pode ser registrado, mas o botão de download informa que o arquivo está pendente.

## Estrutura

```text
.
├── database/ddl/          # SQL do RF-004
├── Docs/requisitos/       # Documentação por requisito funcional
├── css/style.css
├── imagens/
├── js/script.js           # Auth, perfil e checkout simulado
├── js/supabase-config.js  # URL e chave publicável
├── paginas/
├── server/index.js        # Handler compartilhado pela Vercel e execução local
├── server/local.js        # Servidor HTTP para desenvolvimento local
├── api/[...path].js       # Adaptador da API para Vercel Functions
├── scripts/build-static.js # Gera os arquivos estáticos da Vercel em dist/
├── vercel.json            # Build e diretório estático Vercel
└── index.html
```

## Documentação

- [RF-001 — Login](Docs/RF-001-login.md)
- [RF-002 — Cadastro de usuário](DocsRF-002-cadastro-usuario.md)
- [RF-003 — Gerenciar download do jogo](Docs/RF-003-gerenciar-download-do-jogo.md)
- [RF-004 — Gestão de pagamentos](Docs/RF-004-gestao-pagamentos.md)

## Limites desta versão

O site está publicado na Vercel. O checkout Stripe mais recente foi enviado para publicação e sua validação no deploy está pendente. No projeto Supabase usado pela aplicação, o schema e a migração de checkout foram aplicados; em uma instalação nova, aplique os arquivos SQL documentados acima. A migração bloqueia acesso web às tabelas legadas `Usuario`, `Cartao` e `Administrador`, caso existam, sem apagar os registros. O arquivo do jogo ainda não está publicado, então o download real segue pendente. A simulação não representa uma transação financeira.
