-- Adapta o schema atual DGS_Web_Site para o checkout hospedado Stripe em modo de teste.
-- Não coleta nem armazena números, códigos de segurança ou dados completos de pagamento.

begin;

alter table public.simulated_payments
    drop constraint if exists simulated_payments_status_check;

alter table public.simulated_payments
    add constraint simulated_payments_status_check
    check (status in ('pending', 'paid', 'failed', 'expired', 'simulated_approved'));

alter table public.simulated_payments
    drop constraint if exists simulated_payments_payment_method_check;

alter table public.simulated_payments
    add constraint simulated_payments_payment_method_check
    check (payment_method in ('boleto', 'credito', 'debito', 'pix'));

create or replace function private.set_simulated_payment_values()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    if (select auth.uid()) is not null then
        new.user_id := (select auth.uid());
    elsif current_user <> 'service_role' or new.user_id is null then
        raise exception 'A verified authenticated user is required to create an order';
    end if;

    new.amount_brl := case new.edition
        when 'standard' then 20.00
        when 'plus' then 40.00
        else null
    end;
    new.status := 'pending';
    new.created_at := now();
    return new;
end;
$$;

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
    if new.status not in ('paid', 'simulated_approved') then
        return new;
    end if;

    update public.profiles
    set user_level = case
        when user_level = 'plus' or new.edition = 'plus' then 'plus'
        else 'standard'
    end
    where user_id = new.user_id;

    if not found then
        raise exception 'A profile is required before confirming an order';
    end if;

    return new;
end;
$$;

drop trigger if exists refresh_user_level_after_payment on public.simulated_payments;
create trigger refresh_user_level_after_payment
    after insert on public.simulated_payments
    for each row execute function private.refresh_user_level_after_payment();

drop trigger if exists refresh_user_level_after_payment_status on public.simulated_payments;
create trigger refresh_user_level_after_payment_status
    after update of status on public.simulated_payments
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
          and status in ('paid', 'simulated_approved')
    ) then
        raise exception 'A paid order belonging to the current user is required';
    end if;

    new.user_id := (select auth.uid());
    new.requested_at := now();
    return new;
end;
$$;

drop trigger if exists set_game_download_owner_before_insert on public.game_downloads;
create trigger set_game_download_owner_before_insert
    before insert on public.game_downloads
    for each row execute function private.set_game_download_owner();

drop policy if exists "Users can create their own simulated orders" on public.simulated_payments;

revoke all on table public.simulated_payments from public, anon, authenticated, service_role;
grant select on table public.simulated_payments to authenticated;
grant select, insert, update on table public.simulated_payments to service_role;

commit;
