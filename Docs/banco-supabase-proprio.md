# Criar o novo projeto Supabase

Este guia prepara um projeto Supabase pessoal para o Yokai Tales. Ele não altera nem copia o banco antigo. O schema está em `database/ddl/new-project-schema.sql`.

## 1. Criar o projeto

1. Entre no [painel Supabase](https://supabase.com/dashboard) com uma conta que possa criar projetos.
2. Clique em **New project** e escolha a organização pessoal.
3. Defina um nome, uma senha forte para o banco e a região mais próxima disponível.
4. Guarde a senha no gerenciador de senhas. Não a envie pelo chat nem a coloque no frontend.
5. Aguarde o status do projeto ficar pronto.

## 2. Aplicar o schema

1. Abra **SQL Editor** no projeto novo e crie uma consulta em branco.
2. No repositório, abra `database/ddl/new-project-schema.sql`, copie todo o conteúdo e cole no editor.
3. Revise se o topo do painel indica o projeto novo, e então clique em **Run**.
4. Resultado esperado: execução concluída sem erro. O script cria `profiles`, `admin`, `simulated_payments` e `game_downloads`; não cria nem apaga tabelas legadas.
5. Em **Table Editor**, confira essas quatro tabelas. Em cada uma, confira que RLS está habilitado. `profiles` deverá começar vazia se ainda não houver usuários Auth.

O gatilho cria automaticamente um perfil quando alguém se cadastra no Supabase Auth. Também preenche perfis para usuários Auth que já existiam antes da aplicação do schema. O e-mail fica como fonte de verdade no Auth; a API pode retorná-lo junto do perfil.

## 3. Criar sua conta e conceder a si mesmo o acesso administrativo

1. Abra **Authentication → Users → Add user → Create new user**.
2. Use seu e-mail de teste e marque a confirmação de e-mail, se o painel oferecer essa opção. Defina a senha diretamente no painel.
3. Depois da criação, abra **SQL Editor** e execute a consulta abaixo, substituindo o e-mail pelo seu. Ela adiciona somente esse usuário à tabela `admin`:

```sql
insert into public.admin (user_id)
select id
from auth.users
where lower(email) = lower('SEU_EMAIL')
on conflict (user_id) do nothing;
```

4. Confira em **Table Editor → admin** que aparece apenas sua conta. A tabela não permite inserção pelo cliente do site; a manutenção deve ser feita por você no painel/SQL Editor.

Se a conta já tiver sido criada pelo formulário do site, use o mesmo e-mail e não crie outra conta. O perfil já deverá existir pelo gatilho.

## 4. Verificar a base antes de conectar o site

Na aba SQL Editor, confirme os nomes/colunas e a proteção com RLS. Um teste rápido de estrutura:

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('profiles', 'admin', 'simulated_payments', 'game_downloads')
order by table_name;
```

Devem aparecer quatro tabelas. Para conferir RLS:

```sql
select c.relname as tabela, c.relrowsecurity as rls_ativo
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('profiles', 'admin', 'simulated_payments', 'game_downloads')
order by c.relname;
```

As quatro linhas devem mostrar `rls_ativo = true`.

## 5. Conexão com o site

Ainda não troque as variáveis do `.env` atual. O site em seu estado atual envia pedidos sem `payment_method` e espera o formato antigo de perfil; trocar agora faria o checkout falhar. Depois da aprovação desta etapa, a próxima etapa será adaptar API, interface e testes para `profiles` e para uma das quatro formas de pagamento. Só então configuraremos URL e chave publicável do projeto novo localmente e rodaremos a integração real.

Use a URL base exibida em **Project Settings → API** e a chave publicável (`publishable`/`anon`, conforme o painel). A URL base não deve terminar em `/rest/v1/`. Não use a senha do banco, `service_role` ou chave secreta no navegador, no `.env.example`, em commit ou no chat. O arquivo `.env` é local e deve permanecer fora do Git.

## Regras do modelo

- `profiles.user_id` é a chave primária e referência `auth.users.id`.
- `user_email` não é duplicado na tabela; vem do Supabase Auth.
- `user_level` fica `NULL` antes da primeira compra, passa a `standard` após a edição de R$ 20,00, e a `plus` após a edição de R$ 40,00. `plus` prevalece caso as duas compras existam.
- `payment_method` registra apenas a modalidade simulada (`boleto`, `credito`, `debito` ou `pix`); não armazenamos dados bancários/cartão.
- O nome SQL fica `admin` em minúsculas, padrão mais simples para PostgreSQL; representa a tabela “Admin” solicitada.
- Não há endpoint público para criar administradores. Novas contas administrativas são inseridas manualmente por você no painel.
