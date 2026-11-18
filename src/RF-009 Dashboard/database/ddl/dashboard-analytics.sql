-- Apply after new-project-schema.sql and feedback-comments.sql.
begin;

create table if not exists public.page_visits (
    page_path text primary key check (
        page_path in (
            '/',
            '/index.html',
            '/paginas/tales.html',
            '/paginas/outros_jogos.html',
            '/paginas/download.html',
            '/paginas/atualizacoes.html',
            '/paginas/feedback.html',
            '/paginas/doacoes.html',
            '/paginas/perfil.html',
            '/paginas/cadastro.html',
            '/paginas/login.html',
            '/paginas/recuperar-senha.html',
            '/paginas/dashboard.html'
        )
    ),
    visit_count bigint not null default 0 check (visit_count >= 0),
    updated_at timestamptz not null default now()
);

alter table public.page_visits enable row level security;
revoke all on table public.page_visits from public, anon, authenticated, service_role;
grant select on table public.page_visits to service_role;

-- A API administrativa lê somente os campos de perfil exibidos no dashboard.
grant select (user_id, user_name, user_level) on table public.profiles to service_role;
grant select on table public.game_downloads to service_role;

create or replace function public.record_page_visit(p_page_path text)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
    current_count bigint;
begin
    insert into public.page_visits (page_path, visit_count, updated_at)
    values (p_page_path, 1, now())
    on conflict (page_path) do update
        set visit_count = public.page_visits.visit_count + 1,
            updated_at = now()
    returning visit_count into current_count;

    return current_count;
end;
$$;

revoke all on function public.record_page_visit(text) from public, anon, authenticated;
grant execute on function public.record_page_visit(text) to service_role;

commit;
