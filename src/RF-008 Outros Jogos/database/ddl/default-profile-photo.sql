-- Apply after new-project-schema.sql on an existing DGS_Web_Site project.
-- Assigns the site's bundled default avatar to existing profiles without a photo
-- and to profiles created by future Supabase Auth signups.

begin;

alter table public.profiles
    alter column user_foto set default '/imagens/user-img-default.jpg';

update public.profiles
set user_foto = '/imagens/user-img-default.jpg'
where user_foto is null;

alter table public.profiles
    alter column user_foto set not null;

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

commit;
