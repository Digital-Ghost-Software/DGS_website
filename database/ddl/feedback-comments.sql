-- Apply after new-project-schema.sql to enable community feedback comments.
begin;

create table if not exists public.feedback_comments (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users (id) on delete cascade,
    author_name text not null check (char_length(btrim(author_name)) between 1 and 80),
    content text not null check (char_length(btrim(content)) between 1 and 2000),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists feedback_comments_created_at_idx
    on public.feedback_comments (created_at desc);

create or replace function public.is_feedback_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1
        from public.admin
        where user_id = (select auth.uid())
    );
$$;

revoke all on function public.is_feedback_admin() from public, anon, authenticated, service_role;
grant execute on function public.is_feedback_admin() to authenticated;

create or replace function public.set_feedback_comment_values()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    if (select auth.uid()) is null then
        raise exception 'A verified authenticated user is required to post a comment';
    end if;

    new.user_id := (select auth.uid());
    select coalesce(
        (
            select user_name
            from public.profiles
            where user_id = new.user_id
        ),
        (
            select coalesce(
                nullif(btrim(raw_user_meta_data ->> 'user_name'), ''),
                nullif(btrim(raw_user_meta_data ->> 'full_name'), ''),
                nullif(split_part(coalesce(email, ''), '@', 1), '')
            )
            from auth.users
            where id = new.user_id
        ),
        'Usuário'
    )
    into new.author_name;

    new.created_at := now();
    new.updated_at := now();
    return new;
end;
$$;

revoke all on function public.set_feedback_comment_values() from public, anon, authenticated, service_role;

drop trigger if exists set_feedback_comment_values_before_insert on public.feedback_comments;
create trigger set_feedback_comment_values_before_insert
    before insert on public.feedback_comments
    for each row execute function public.set_feedback_comment_values();

create or replace function public.set_feedback_comment_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    new.updated_at := now();
    return new;
end;
$$;

revoke all on function public.set_feedback_comment_updated_at() from public, anon, authenticated, service_role;

drop trigger if exists set_feedback_comment_updated_at_before_update on public.feedback_comments;
create trigger set_feedback_comment_updated_at_before_update
    before update on public.feedback_comments
    for each row execute function public.set_feedback_comment_updated_at();

alter table public.feedback_comments enable row level security;

drop policy if exists "Anyone can read feedback comments" on public.feedback_comments;
create policy "Anyone can read feedback comments"
    on public.feedback_comments for select to anon, authenticated
    using (true);

drop policy if exists "Authenticated users can post feedback comments" on public.feedback_comments;
create policy "Authenticated users can post feedback comments"
    on public.feedback_comments for insert to authenticated
    with check (user_id = (select auth.uid()));

drop policy if exists "Admins can update feedback comments" on public.feedback_comments;
create policy "Admins can update feedback comments"
    on public.feedback_comments for update to authenticated
    using ((select public.is_feedback_admin()))
    with check ((select public.is_feedback_admin()));

drop policy if exists "Admins can delete feedback comments" on public.feedback_comments;
create policy "Admins can delete feedback comments"
    on public.feedback_comments for delete to authenticated
    using ((select public.is_feedback_admin()));

revoke all on table public.feedback_comments from public, anon, authenticated, service_role;
grant select on table public.feedback_comments to anon, authenticated;
grant insert (content) on table public.feedback_comments to authenticated;
grant update (content) on table public.feedback_comments to authenticated;
grant delete on table public.feedback_comments to authenticated;

commit;
