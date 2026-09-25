import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const sqlPath = path.join(process.cwd(), "database", "ddl", "rf-004-simulated-payments.sql");
const sql = (await readFile(sqlPath, "utf8")).toLowerCase();

test("RF-004 migration defines payment and download records with database constraints", () => {
    assert.match(sql, /create table if not exists public\.simulated_payments/);
    assert.match(sql, /edition in \('standard', 'plus'\)/);
    assert.match(sql, /amount_brl in \(20\.00, 40\.00\)/);
    assert.match(sql, /status = 'simulated_approved'/);
    assert.match(sql, /create table if not exists public\.game_downloads/);
    assert.match(sql, /payment_id uuid not null references public\.simulated_payments/);
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
