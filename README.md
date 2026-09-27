# Digital Ghost Software — Yokai Tales

Site acadêmico de apresentação do estúdio fictício Digital Ghost Software e do jogo Yokai Tales. O projeto usa HTML, CSS, JavaScript, Node.js e Supabase. O checkout é uma **simulação acadêmica**: não processa pagamentos nem coleta dados de cartão.

## Funcionalidades no projeto

- Páginas de apresentação, cadastro, login, perfil e compra/download.
- Cadastro e autenticação com Supabase Auth.
- Recuperação de senha por e-mail em uma página com estados de solicitação e redefinição.
- Pedidos simulados das edições Standard (R$ 20,00) e Plus (R$ 40,00).
- Registro/histórico de pedidos e solicitações de download no Supabase, limitados ao usuário autenticado por RLS.
- Troca de senha pela sessão autenticada.

## API Node.js

`server/index.js` verifica o bearer token do Supabase Auth. Rotas públicas: `GET /api/config` e `GET /api/health`. Rotas autenticadas: `GET/PATCH /api/profile`, `GET/POST /api/payments`, `POST /api/downloads` e `POST /api/account/delete`. Consultas de perfil/pedido/download usam o JWT do usuário e mantêm as políticas RLS; cadastro, login, recuperação e atualização de senha usam Supabase Auth no cliente. `server/local.js` inicia o servidor HTTP local; a chave administrativa é opcional e só é usada para exclusão da identidade autenticada.

## Publicação

O repositório inclui a configuração para publicar site estático e API Node.js na Vercel. A configuração versionada está em `vercel.json`, `api/` e `scripts/build-static.js`; o projeto publicado usa a API na mesma origem. A chave `SUPABASE_SERVICE_ROLE_KEY` é opcional para iniciar a API e necessária para exclusão de conta.

## Configuração

1. Use o projeto Supabase `DGS_Web_Site` configurado para o trabalho em grupo. Para criar uma instalação nova aprovada pela equipe, aplique [`database/ddl/new-project-schema.sql`](database/ddl/new-project-schema.sql) no SQL Editor; não use a migração RF-004 do banco legado neste schema. Para atualizar um projeto já configurado, aplique também a migração incremental [`database/ddl/default-profile-photo.sql`](database/ddl/default-profile-photo.sql); ela preenche perfis atuais sem foto e configura o padrão para novos usuários.
2. Na raiz do projeto, crie um `.env` local (o arquivo é ignorado pelo Git) com `SUPABASE_URL` e `SUPABASE_PUBLISHABLE_KEY`. Use a URL base do projeto, sem `/rest/v1/`, e a chave publicável/anon. O servidor Node 22 carrega o arquivo local e `/api/config` entrega ao navegador somente esses valores públicos. Nunca coloque senha do banco, chave `service_role` ou chave secreta no frontend, repositório ou chat.
3. Instale dependências com Node.js 22.x usando `npm ci`. Execute `npm test` para a suíte completa ou `npm run test:unit` e `npm run test:integration` separadamente.
4. Habilite autenticação por e-mail no Supabase e defina confirmação de e-mail conforme a política do projeto. Em Authentication → URL Configuration, inclua `http://localhost:3000/paginas/login.html` e `http://localhost:3000/paginas/recuperar-senha.html` em Redirect URLs. A recuperação por e-mail usa a segunda rota para retornar ao estado de nova senha.
5. Inicie o site e API integrados com `npm start` e acesse `http://localhost:3000/`. Não abra as páginas como `file://` nem use outro servidor estático sem configurar também a API.
6. `SUPABASE_SERVICE_ROLE_KEY` só é necessária para excluir uma conta; se usada, deve permanecer exclusivamente no servidor. Sem ela, essa operação retorna indisponível.
7. Um arquivo público do jogo ainda não foi disponibilizado. Quando houver uma URL estável de release, configure `GAME_DOWNLOAD_URL` no ambiente do servidor; até lá o pedido pode ser registrado, mas o botão de download informa que o arquivo está pendente.

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

- [RF-001 — Login](Docs/requisitos/RF-001-login.md)
- [RF-002 — Cadastro de usuário](Docs/requisitos/RF-002-cadastro-usuario.md)
- [RF-003 — Gerenciar download do jogo](Docs/requisitos/RF-003-gerenciar-download-do-jogo.md)
- [RF-004 — Gestão de pagamentos](Docs/requisitos/RF-004-gestao-pagamentos.md)
- [Plano de refinamento e pendências](Docs/requisitos/plano-de-refinamento.md)

## Limites desta versão

O banco Supabase precisa receber a migração SQL e ser configurado no painel. A migração bloqueia acesso web às tabelas legadas `Usuario`, `Cartao` e `Administrador`, caso existam, mas preserva os registros atuais sem os apagar. O deploy da aplicação não foi realizado e o arquivo do jogo ainda não está publicado; portanto, a integração remota e o download real seguem pendentes. A simulação não representa uma transação financeira.
