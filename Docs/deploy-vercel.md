# Publicação do site e da API na Vercel

## O que muda

A integração Vercel publica o site estático e a API Node.js no mesmo projeto e na mesma origem. A API local continua disponível por `npm start`. Para a publicação Vercel, `npm run build` copia apenas os arquivos públicos para `dist/`, enquanto a função em `api/[...path].js` encaminha as rotas para o handler compartilhado em `server/index.js`.

## Antes de publicar

- A branch `main` já foi enviada ao repositório [Digital-Ghost-Software/DGS_website](https://github.com/Digital-Ghost-Software/DGS_website). O projeto Vercel ainda precisa ser importado e publicado.
- Configure `SUPABASE_URL` e `SUPABASE_PUBLISHABLE_KEY` nas variáveis da Vercel. A URL deve ser a base do projeto e não terminar em `/rest/v1/`. A rota `/api/config` fornece esses dois valores públicos ao navegador; eles não ficam hardcoded no JavaScript.
- A publishable key é pública por projeto. A chave secreta/`service_role` nunca deve entrar no navegador, Git ou mensagens.
- O checkout, o histórico e a leitura de perfil usam a chave pública com o JWT do usuário e RLS. A API inicia sem `SUPABASE_SERVICE_ROLE_KEY`; sem ela, apenas a exclusão de conta retorna indisponível. Para habilitar exclusão, um administrador do projeto pode copiar a chave secreta em Supabase → Project Settings → API Keys e cadastrá-la diretamente nas variáveis da Vercel. Ele não precisa enviá-la para você nem para este repositório.
- O schema `database/ddl/new-project-schema.sql` já foi aplicado e verificado no Supabase `DGS_Web_Site`.

## Criar o projeto Vercel

1. No painel da Vercel, escolha **Add New → Project**, conecte o GitHub se necessário e importe `Digital-Ghost-Software/DGS_website`. Selecione `main` como Production Branch. O deploy ainda não foi realizado.
2. Nas opções do projeto, use a raiz do repositório como Root Directory e o preset **Other**. Defina Build Command como `npm run build` e Output Directory como `dist`; mantenha o comando de instalação padrão (`npm install`). O projeto usa Node.js `22.x` conforme `package.json`.
3. Em **Settings → Environment Variables**, configure `SUPABASE_URL` e `SUPABASE_PUBLISHABLE_KEY` do projeto `DGS_Web_Site` para Production e Preview. Opcionalmente, configure a chave de serviço do mesmo projeto como `SUPABASE_SERVICE_ROLE_KEY` caso queira habilitar exclusão de conta; cadastre-a como variável sensível e nunca no repositório. Sem ela, a exclusão de conta permanece indisponível.
4. Não configure `ALLOWED_ORIGINS` nem `API_BASE_URL` no deploy integrado. A UI chama `/api/...` na própria origem.
5. Clique em **Deploy**. Abra `https://DOMINIO-ATRIBUIDO.vercel.app/api/health`; a resposta esperada é `{"status":"ok"}`. Se configurar ou alterar uma variável depois do primeiro deploy, faça novo deploy para que ela entre em vigor.
6. Confirme que o schema `database/ddl/new-project-schema.sql` já foi aplicado ao projeto Supabase conectado antes de testar checkout e histórico.
7. Em Supabase Auth → URL Configuration, defina a URL Vercel de produção como Site URL. Adicione `https://DOMINIO-ATRIBUIDO.vercel.app/paginas/login.html` e `https://DOMINIO-ATRIBUIDO.vercel.app/paginas/recuperar-senha.html` à lista de Redirect URLs. Em desenvolvimento, adicione também `http://localhost:3000/paginas/recuperar-senha.html`. O cadastro redireciona para o login e a recuperação retorna à mesma página em um estado próprio para cadastrar a nova senha; se usar previews, adicione um padrão de redirect Preview restrito à equipe, conforme a [documentação Supabase](https://supabase.com/docs/guides/auth/redirect-urls).
8. Teste login, pedido Standard/Plus e histórico com contas de teste. Para atender exclusão de conta, confirme que `SUPABASE_SERVICE_ROLE_KEY` do projeto correto está configurada e teste a exclusão de uma conta de teste.

## Referências oficiais

- [Vercel: Node.js Functions](https://vercel.com/docs/functions/runtimes/node-js)
- [Vercel: Builds estáticos](https://vercel.com/docs/builds)
- [Vercel: variáveis de ambiente](https://vercel.com/docs/environment-variables)
- [Supabase: segurança das chaves de API](https://supabase.com/docs/guides/database/secure-data)

## Limites conhecidos

- O arquivo real do jogo continua indisponível; publicar a aplicação não cria a release nem habilita o download.
- A URL final Vercel é definida no painel; não é inventada ou gravada neste repositório.
- A API depende das variáveis `SUPABASE_URL` e `SUPABASE_PUBLISHABLE_KEY`; sem elas, a configuração do cliente não inicia. Sem `SUPABASE_SERVICE_ROLE_KEY`, exclusão de conta fica explicitamente indisponível.
- Uma chave secreta Supabase de um commit legado foi removida do histórico publicado da `main`; a chave precisa ser rotacionada no painel do projeto Supabase correspondente. Isso não foi feito pelo Git e a chave não está neste guia.
