-- Outros jogos da equipe e armazenamento público das respectivas imagens.
-- Pré-requisito: public.is_feedback_admin(), criada por feedback-comments.sql.
begin;

do $$
begin
    if to_regprocedure('public.is_feedback_admin()') is null then
        raise exception 'Missing public.is_feedback_admin(). Apply database/ddl/feedback-comments.sql first.';
    end if;
end;
$$;

create table if not exists public.other_games (
    id uuid primary key default gen_random_uuid(),
    name text not null check (char_length(btrim(name)) between 1 and 120),
    url text not null check (
        char_length(btrim(url)) between 1 and 2048
        and btrim(url) ~* '^https?://'
    ),
    image_path text not null check (
        image_path ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|jpg|webp)$'
    ),
    created_at timestamptz not null default now()
);

create index if not exists other_games_created_at_idx
    on public.other_games (created_at desc);

alter table public.other_games enable row level security;

drop policy if exists "Anyone can read other games" on public.other_games;
create policy "Anyone can read other games"
    on public.other_games for select to anon, authenticated
    using (true);

drop policy if exists "Admins can create other games" on public.other_games;
create policy "Admins can create other games"
    on public.other_games for insert to authenticated
    with check ((select public.is_feedback_admin()));

drop policy if exists "Admins can update other games" on public.other_games;
create policy "Admins can update other games"
    on public.other_games for update to authenticated
    using ((select public.is_feedback_admin()))
    with check ((select public.is_feedback_admin()));

drop policy if exists "Admins can delete other games" on public.other_games;
create policy "Admins can delete other games"
    on public.other_games for delete to authenticated
    using ((select public.is_feedback_admin()));

revoke all on table public.other_games from public, anon, authenticated, service_role;
grant select on public.other_games to anon, authenticated;
grant insert (name, url, image_path) on public.other_games to authenticated;
grant update (name, url, image_path) on public.other_games to authenticated;
grant delete on public.other_games to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('other-games', 'other-games', true, 3145728, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Admins can upload other game images" on storage.objects;
create policy "Admins can upload other game images"
    on storage.objects for insert to authenticated
    with check (
        bucket_id = 'other-games'
        and (select public.is_feedback_admin())
        and (storage.foldername(name))[1] = (select auth.uid())::text
    );

drop policy if exists "Admins can delete other game images" on storage.objects;
create policy "Admins can delete other game images"
    on storage.objects for delete to authenticated
    using (
        bucket_id = 'other-games'
        and (select public.is_feedback_admin())
    );

commit;
