import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const sqlPath = path.join(process.cwd(), "database", "ddl", "rf-004-simulated-payments.sql");
const sql = (await readFile(sqlPath, "utf8")).toLowerCase();
const freshSchemaPath = path.join(process.cwd(), "database", "ddl", "new-project-schema.sql");
const freshSchema = (await readFile(freshSchemaPath, "utf8")).toLowerCase();
const defaultProfilePhotoMigrationPath = path.join(process.cwd(), "database", "ddl", "default-profile-photo.sql");
const defaultProfilePhotoMigration = (await readFile(defaultProfilePhotoMigrationPath, "utf8")).toLowerCase();
const stripeCheckoutMigrationPath = path.join(process.cwd(), "database", "ddl", "stripe-test-checkout.sql");
const stripeCheckoutMigration = (await readFile(stripeCheckoutMigrationPath, "utf8")).toLowerCase();

test("RF-004 migration defines payment and download records with database constraints", () => {
    assert.match(sql, /create table if not exists public\.simulated_payments/);
    assert.match(sql, /edition in \('standard', 'plus'\)/);
    assert.match(sql, /amount_brl in \(20\.00, 40\.00\)/);
    assert.match(sql, /status = 'simulated_approved'/);
    assert.match(sql, /create table if not exists public\.game_downloads/);
    assert.match(sql, /payment_id uuid not null references public\.simulated_payments/);
});

test("novo schema cria somente as tabelas novas com perfil associado ao Supabase Auth", () => {
    assert.match(freshSchema, /create table if not exists public\.profiles/);
    assert.match(freshSchema, /user_id uuid primary key references auth\.users\s*\(id\) on delete cascade/);
    assert.match(freshSchema, /user_name text not null/);
    assert.match(freshSchema, /user_foto text/);
    assert.match(freshSchema, /user_level text check \(user_level in \('standard', 'plus'\)\)/);
    assert.match(freshSchema, /create table if not exists public\.admin/);
    assert.match(freshSchema, /create table if not exists public\.simulated_payments/);
    assert.match(freshSchema, /payment_method text not null check \(payment_method in \('boleto', 'credito', 'debito', 'pix'\)\)/);
    assert.match(freshSchema, /status text not null check \(status in \('pending', 'paid', 'failed', 'expired'\)\)/);
    assert.match(freshSchema, /create table if not exists public\.game_downloads/);
    for (const legacyTable of ["usuario", "cartao", "administrador"]) {
        assert.doesNotMatch(freshSchema, new RegExp(`create\\s+table[^;]*public\\.${legacyTable}\\b`));
    }
});

test("novo schema protege nível, pedidos, downloads e administração com triggers, grants e RLS", () => {
    assert.match(freshSchema, /after insert on auth\.users[\s\S]*execute function private\.create_profile_for_auth_user/);
    assert.match(freshSchema, /grant update \(user_name, user_foto\) on table public\.profiles to authenticated/);
    assert.doesNotMatch(freshSchema, /grant update \([^)]*user_level[^)]*\) to authenticated/);
    assert.match(freshSchema, /grant select on table public\.admin to service_role/);
    assert.match(freshSchema, /grant select, insert, update on table public\.simulated_payments to service_role/);
    assert.match(freshSchema, /grant select on table public\.simulated_payments to authenticated/);
    assert.doesNotMatch(freshSchema, /grant select, insert on table public\.simulated_payments to authenticated/);
    assert.doesNotMatch(freshSchema, /grant\s+(?:select|insert|update|delete|all)[^;]*public\.admin[^;]*to authenticated/);
    assert.match(freshSchema, /new\.user_id := \(select auth\.uid\(\)\)/);
    assert.match(freshSchema, /where id = new\.payment_id[\s\S]*user_id = \(select auth\.uid\(\)\)/);
    assert.match(freshSchema, /new\.status not in \('paid', 'simulated_approved'\)[\s\S]*user_level = case[\s\S]*user_level = 'plus' or new\.edition = 'plus' then 'plus'/);
    assert.match(freshSchema, /after update of status on public\.simulated_payments/);
    assert.match(freshSchema, /alter table public\.profiles enable row level security/);
    assert.match(freshSchema, /alter table public\.simulated_payments enable row level security/);
    assert.match(freshSchema, /alter table public\.game_downloads enable row level security/);
});

test("Stripe payment migration keeps old orders and limits confirmed statuses to verified payments", () => {
    assert.match(stripeCheckoutMigration, /check \(status in \('pending', 'paid', 'failed', 'expired', 'simulated_approved'\)\)/);
    assert.match(stripeCheckoutMigration, /payment_method in \('boleto', 'credito', 'debito', 'pix'\)/);
    assert.match(stripeCheckoutMigration, /new\.status := 'pending'/);
    assert.match(stripeCheckoutMigration, /current_user <> 'service_role'/);
    assert.match(stripeCheckoutMigration, /new\.status not in \('paid', 'simulated_approved'\)/);
    assert.match(stripeCheckoutMigration, /after update of status on public\.simulated_payments/);
    assert.match(stripeCheckoutMigration, /status in \('paid', 'simulated_approved'\)/);
    assert.match(stripeCheckoutMigration, /grant select on table public\.simulated_payments to authenticated/);
    assert.match(stripeCheckoutMigration, /grant select, insert, update on table public\.simulated_payments to service_role/);
    assert.doesNotMatch(stripeCheckoutMigration, /\b(?:drop\s+table|truncate\s+table|delete\s+from)\b/);
});

test("schema novo and additive migration assign the default photo to profiles", () => {
    for (const source of [freshSchema, defaultProfilePhotoMigration]) {
        assert.match(source, /user_foto[^;]*default '\/imagens\/user-img-default\.jpg'/);
        assert.match(source, /coalesce\(nullif\([^)]*user_foto[^)]*\), '\/imagens\/user-img-default\.jpg'\)/);
    }
    assert.match(defaultProfilePhotoMigration, /update public\.profiles[\s\S]*set user_foto = '\/imagens\/user-img-default\.jpg'[\s\S]*where user_foto is null/);
    assert.match(defaultProfilePhotoMigration, /begin;[\s\S]*commit;/);
    assert.doesNotMatch(defaultProfilePhotoMigration, /\b(?:drop\s+table|truncate\s+table|delete\s+from)\b/);
});

test("RF-004 migration derives payment and download ownership and values from the authenticated user", () => {
    assert.match(sql, /new\.user_id := auth\.uid\(\)/);
    assert.match(sql, /when 'standard' then 20\.00[\s\S]*when 'plus' then 40\.00/);
    assert.match(sql, /new\.status := 'simulated_approved'/);
    assert.match(sql, /new\.created_at := now\(\)/);
    assert.match(sql, /new\.requested_at := now\(\)/);
    assert.match(sql, /where id = new\.payment_id[\s\S]*and user_id = auth\.uid\(\)[\s\S]*and status = 'simulated_approved'/);
});

test("RF-004 migration enables owner-scoped RLS and prevents client updates or deletes", () => {
    assert.equal((sql.match(/alter table public\.(?:simulated_payments|game_downloads) enable row level security/g) || []).length, 2);
    assert.match(sql, /for select to authenticated[\s\S]*using \(user_id = \(select auth\.uid\(\)\)\)/);
    assert.match(sql, /for insert to authenticated[\s\S]*with check \(user_id = \(select auth\.uid\(\)\)\)/);
    assert.equal((sql.match(/grant select, insert on table public\.(?:simulated_payments|game_downloads) to authenticated/g) || []).length, 2);
    assert.doesNotMatch(sql, /grant\s+(?:all|update|delete)[^;]*to authenticated/);
});

test("RF-004 migration preserves legacy rows while blocking browser-role access", () => {
    for (const table of ["usuario", "cartao", "administrador"]) {
        assert.ok(sql.includes(`'${table}'`), `Expected legacy table ${table} to be protected`);
    }
    assert.match(sql, /alter table public\.%i enable row level security/);
    assert.match(sql, /revoke all on table public\.%i from public, anon, authenticated/);
    assert.doesNotMatch(sql, /\b(?:drop\s+table|truncate\s+table|delete\s+from)\b/);
});
