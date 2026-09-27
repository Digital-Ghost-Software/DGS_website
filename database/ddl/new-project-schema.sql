-- Initial schema for a fresh Yokai Tales Supabase project.
-- This file is intentionally separate from rf-004-simulated-payments.sql,
-- which was already applied to the existing project.

create extension if not exists pgcrypto;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated, service_role;

create table if not exists public.profiles (
    user_id uuid primary key references auth.users (id) on delete cascade,
    user_name text not null check (char_length(btrim(user_name)) between 1 and 80),
    user_foto text not null default '/imagens/user-img-default.jpg' check (char_length(user_foto) <= 500),
    user_level text check (user_level in ('standard', 'plus')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.profiles
    alter column user_foto set default '/imagens/user-img-default.jpg';

update public.profiles
set user_foto = '/imagens/user-img-default.jpg'
where user_foto is null;

alter table public.profiles
    alter column user_foto set not null;

create table if not exists public.admin (
    user_id uuid primary key references auth.users (id) on delete cascade,
    created_at timestamptz not null default now()
);

create table if not exists public.simulated_payments (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users (id) on delete cascade,
    edition text not null check (edition in ('standard', 'plus')),
    amount_brl numeric(10, 2) not null check (amount_brl in (20.00, 40.00)),
    payment_method text not null check (payment_method in ('boleto', 'credito', 'debito', 'pix')),
    status text not null check (status = 'simulated_approved'),
    created_at timestamptz not null default now()
);

create index if not exists simulated_payments_user_created_idx
    on public.simulated_payments (user_id, created_at desc);

create table if not exists public.game_downloads (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users (id) on delete cascade,
    payment_id uuid not null references public.simulated_payments (id) on delete cascade,
    release_version text not null default '1.0',
    requested_at timestamptz not null default now()
);

create index if not exists game_downloads_user_requested_idx
    on public.game_downloads (user_id, requested_at desc);

create or replace function private.create_profile_for_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
    profile_name text;
begin
    profile_name := left(
        coalesce(
            nullif(btrim(new.raw_user_meta_data ->> 'user_name'), ''),
            nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
            nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
            'Usuário'
        ),
        80
    );

    insert into public.profiles (user_id, user_name, user_foto)
    values (
        new.id,
        profile_name,
        coalesce(nullif(new.raw_user_meta_data ->> 'user_foto', ''), '/imagens/user-img-default.jpg')
    )
    on conflict (user_id) do nothing;

    return new;
end;
$$;

revoke all on function private.create_profile_for_auth_user() from public, anon, authenticated, service_role;

drop trigger if exists create_profile_after_auth_signup on auth.users;
create trigger create_profile_after_auth_signup
    after insert on auth.users
    for each row execute function private.create_profile_for_auth_user();

-- Also create profiles for test/admin Auth users created before this schema.
insert into public.profiles (user_id, user_name, user_foto)
select
    id,
    left(
        coalesce(
            nullif(btrim(raw_user_meta_data ->> 'user_name'), ''),
            nullif(btrim(raw_user_meta_data ->> 'full_name'), ''),
            nullif(split_part(coalesce(email, ''), '@', 1), ''),
            'Usuário'
        ),
        80
    ),
    coalesce(nullif(raw_user_meta_data ->> 'user_foto', ''), '/imagens/user-img-default.jpg')
from auth.users
on conflict (user_id) do nothing;

create or replace function private.set_profile_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    new.updated_at := now();
    return new;
end;
$$;

revoke all on function private.set_profile_updated_at() from public, anon, authenticated, service_role;

drop trigger if exists set_profile_updated_at_before_update on public.profiles;
create trigger set_profile_updated_at_before_update
    before update on public.profiles
    for each row execute function private.set_profile_updated_at();

create or replace function private.set_simulated_payment_values()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    if (select auth.uid()) is null then
        raise exception 'Authentication is required to create an order';
    end if;

    new.user_id := (select auth.uid());
    new.amount_brl := case new.edition
        when 'standard' then 20.00
        when 'plus' then 40.00
        else null
    end;
    new.status := 'simulated_approved';
    new.created_at := now();
    return new;
end;
$$;

revoke all on function private.set_simulated_payment_values() from public, anon, authenticated, service_role;

drop trigger if exists set_simulated_payment_values_before_insert on public.simulated_payments;
create trigger set_simulated_payment_values_before_insert
    before insert on public.simulated_payments
    for each row execute function private.set_simulated_payment_values();

create or replace function private.refresh_user_level_after_payment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    update public.profiles
    set user_level = case
        when user_level = 'plus' or new.edition = 'plus' then 'plus'
        else 'standard'
    end
    where user_id = new.user_id;

    if not found then
        raise exception 'A profile is required before creating an order';
    end if;

    return new;
end;
$$;

revoke all on function private.refresh_user_level_after_payment() from public, anon, authenticated, service_role;

drop trigger if exists refresh_user_level_after_payment on public.simulated_payments;
create trigger refresh_user_level_after_payment
    after insert on public.simulated_payments
    for each row execute function private.refresh_user_level_after_payment();

create or replace function private.set_game_download_owner()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    if (select auth.uid()) is null then
        raise exception 'Authentication is required to request a download';
    end if;

    if not exists (
        select 1
        from public.simulated_payments
        where id = new.payment_id
          and user_id = (select auth.uid())
          and status = 'simulated_approved'
    ) then
        raise exception 'An approved order belonging to the current user is required';
    end if;

    new.user_id := (select auth.uid());
    new.requested_at := now();
    return new;
end;
$$;

revoke all on function private.set_game_download_owner() from public, anon, authenticated, service_role;

drop trigger if exists set_game_download_owner_before_insert on public.game_downloads;
create trigger set_game_download_owner_before_insert
    before insert on public.game_downloads
    for each row execute function private.set_game_download_owner();

alter table public.profiles enable row level security;
alter table public.admin enable row level security;
alter table public.simulated_payments enable row level security;
alter table public.game_downloads enable row level security;

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
    on public.profiles for select to authenticated
    using (user_id = (select auth.uid()));

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
    on public.profiles for update to authenticated
    using (user_id = (select auth.uid()))
    with check (user_id = (select auth.uid()));

drop policy if exists "Users can read their own simulated orders" on public.simulated_payments;
create policy "Users can read their own simulated orders"
    on public.simulated_payments for select to authenticated
    using (user_id = (select auth.uid()));

drop policy if exists "Users can create their own simulated orders" on public.simulated_payments;
create policy "Users can create their own simulated orders"
    on public.simulated_payments for insert to authenticated
    with check (user_id = (select auth.uid()));

drop policy if exists "Users can read their own download requests" on public.game_downloads;
create policy "Users can read their own download requests"
    on public.game_downloads for select to authenticated
    using (user_id = (select auth.uid()));

drop policy if exists "Users can create their own download requests" on public.game_downloads;
create policy "Users can create their own download requests"
    on public.game_downloads for insert to authenticated
    with check (user_id = (select auth.uid()));

revoke all on table public.profiles from public, anon, authenticated, service_role;
grant select on table public.profiles to authenticated;
grant update (user_name, user_foto) on table public.profiles to authenticated;

revoke all on table public.admin from public, anon, authenticated, service_role;
grant select on table public.admin to service_role;

revoke all on table public.simulated_payments from public, anon, authenticated, service_role;
grant select, insert on table public.simulated_payments to authenticated;

revoke all on table public.game_downloads from public, anon, authenticated, service_role;
grant select, insert on table public.game_downloads to authenticated;
