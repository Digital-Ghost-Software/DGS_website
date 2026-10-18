-- Notas de atualização do jogo.
-- Pré-requisito: public.is_feedback_admin(), criada por feedback-comments.sql.
-- O script aborta se a verificação administrativa não estiver instalada.
begin;

do $$
begin
    if to_regprocedure('public.is_feedback_admin()') is null then
        raise exception 'Missing public.is_feedback_admin(). Apply database/ddl/feedback-comments.sql first.';
    end if;
end;
$$;

-- Conteúdo público das notas e valores protegidos por restrições no banco.
create table if not exists public.game_updates (
    id uuid primary key default gen_random_uuid(),
    title text not null check (char_length(btrim(title)) between 1 and 160),
    version text not null check (char_length(btrim(version)) between 1 and 40),
    release_date date not null,
    category text check (
        category is null or category in (
            'Novidades', 'Melhorias', 'Correções de bugs',
            'Balanceamento', 'Eventos', 'Outros'
        )
    ),
    description text not null check (char_length(btrim(description)) between 1 and 10000),
    created_at timestamptz not null default now()
);

-- Índice alinhado com a ordenação da página.
create index if not exists game_updates_release_date_created_at_idx
    on public.game_updates (release_date desc, created_at desc);

alter table public.game_updates enable row level security;

-- Leitura pública; a criação e exclusão continuam limitadas a administradores.
drop policy if exists "Anyone can read game updates" on public.game_updates;
create policy "Anyone can read game updates"
    on public.game_updates for select to anon, authenticated
    using (true);

drop policy if exists "Admins can create game updates" on public.game_updates;
create policy "Admins can create game updates"
    on public.game_updates for insert to authenticated
    with check ((select public.is_feedback_admin()));

drop policy if exists "Admins can delete game updates" on public.game_updates;
create policy "Admins can delete game updates"
    on public.game_updates for delete to authenticated
    using ((select public.is_feedback_admin()));

-- Concede somente as operações necessárias à aplicação no navegador.
revoke all on table public.game_updates from public, anon, authenticated, service_role;
grant select on table public.game_updates to anon, authenticated;
grant insert (title, version, release_date, category, description)
    on public.game_updates to authenticated;
grant delete on table public.game_updates to authenticated;

commit;
