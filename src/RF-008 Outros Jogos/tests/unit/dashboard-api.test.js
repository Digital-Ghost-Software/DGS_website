import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createDashboardHandler } from "../../server/routes/dashboard.js";

const analyticsMigration = await readFile(
    new URL("../../database/ddl/dashboard-analytics.sql", import.meta.url),
    "utf8"
);
const trackedPagePaths = [
    "/",
    "/index.html",
    "/paginas/tales.html",
    "/paginas/outros_jogos.html",
    "/paginas/download.html",
    "/paginas/atualizacoes.html",
    "/paginas/feedback.html",
    "/paginas/doacoes.html",
    "/paginas/perfil.html",
    "/paginas/cadastro.html",
    "/paginas/login.html",
    "/paginas/recuperar-senha.html",
    "/paginas/dashboard.html"
];
const trackedPageFiles = [
    "index.html",
    ...trackedPagePaths
        .filter((pagePath) => pagePath.startsWith("/paginas/"))
        .map((pagePath) => pagePath.slice(1))
];

function createSetup({ admin = true, authenticated = true } = {}) {
    const calls = [];
    const adminClient = {
        auth: {
            admin: {
                async listUsers() {
                    return {
                        data: {
                            users: [{
                                id: "user-1",
                                email: "user@example.com",
                                created_at: "2026-01-01T00:00:00Z",
                                last_sign_in_at: null,
                                email_confirmed_at: "2026-01-02T00:00:00Z",
                                password: "must-not-be-returned",
                                user_metadata: { user_name: "Nome" }
                            }]
                        },
                        error: null
                    };
                }
            }
        },
        from(table) {
            const query = {
                select(fields, options) {
                    calls.push({ table, fields, options });
                    return this;
                },
                order(column) {
                    calls.push({ table, order: column });
                    return Promise.resolve({
                        data: [{ page_path: "/", visit_count: 7 }],
                        error: null
                    });
                },
                in(column, values) {
                    calls.push({ table, filter: { column, values } });
                    return Promise.resolve({
                        data: [{ user_id: "user-1", user_name: "Nome", user_level: "plus" }],
                        error: null
                    });
                },
                then(resolve, reject) {
                    return Promise.resolve({ count: 3, error: null }).then(resolve, reject);
                }
            };
            return query;
        },
        async rpc(name, args) {
            calls.push({ rpc: name, args });
            return { data: 4, error: null };
        }
    };
    const authClient = {
        async rpc(name) {
            calls.push({ authRpc: name });
            return { data: admin, error: null };
        }
    };
    const handler = createDashboardHandler({
        authenticate: async () => authenticated
            ? { user: { id: "admin-id" }, client: authClient }
            : { error: "Autenticação necessária.", status: 401 },
        adminClient,
        readJson: async (request) => request.body,
        sendJson: (response, status, body) => Object.assign(response, { status, body })
    });
    return { handler, calls };
}

function request(method, url, body) {
    return { method, url, body };
}

test("records an allowlisted visit and canonicalizes index.html", async () => {
    const { handler, calls } = createSetup();
    const response = {};

    await handler(request("POST", "/api/analytics/visit", { page_path: "/index.html" }), response);

    assert.equal(response.status, 200);
    assert.deepEqual(calls[0], { rpc: "record_page_visit", args: { p_page_path: "/" } });
});

test("SQL migration stores the tracked paths and restricts writes to the server role", () => {
    for (const pagePath of trackedPagePaths) {
        assert.ok(analyticsMigration.includes(`'${pagePath}'`), `missing SQL page path ${pagePath}`);
    }
    assert.match(analyticsMigration, /enable row level security/i);
    assert.match(analyticsMigration, /grant execute on function public\.record_page_visit\(text\) to service_role/i);
    assert.match(analyticsMigration, /grant select \(user_id,\s*user_name,\s*user_level\) on table public\.profiles to service_role/i);
    assert.match(analyticsMigration, /grant select on table public\.game_downloads to service_role/i);
});

test("every tracked page loads visit tracking independently of Supabase initialization", async () => {
    const analyticsClient = await readFile(new URL("../../js/analytics.js", import.meta.url), "utf8");
    assert.match(analyticsClient, /fetch\(["']\/api\/analytics\/visit["']/);
    assert.doesNotMatch(analyticsClient, /supabase|loadSupabaseConfig/i);

    for (const pageFile of trackedPageFiles) {
        const html = await readFile(new URL(`../../${pageFile}`, import.meta.url), "utf8");
        assert.match(html, /<script type="module" src="(?:\.\.\/)?js\/analytics\.js"><\/script>/, pageFile);
    }
});

test("rejects unknown pages without recording a visit", async () => {
    const { handler, calls } = createSetup();
    const response = {};

    await handler(request("POST", "/api/analytics/visit", { page_path: "/private.html" }), response);

    assert.equal(response.status, 400);
    assert.equal(calls.length, 0);
});

test("denies dashboard data to non-admin users", async () => {
    const { handler } = createSetup({ admin: false });
    const response = {};

    await handler(request("GET", "/api/dashboard"), response);

    assert.equal(response.status, 403);
});

test("returns metrics and an explicit, password-free user projection to admins", async () => {
    const { handler } = createSetup();
    const response = {};

    await handler(request("GET", "/api/dashboard"), response);

    assert.equal(response.status, 200);
    assert.equal(response.body.downloads, 3);
    assert.deepEqual(response.body.visits, [{ page_path: "/", visit_count: 7 }]);
    assert.deepEqual(response.body.users, [{
        id: "user-1",
        email: "user@example.com",
        user_name: "Nome",
        user_level: "plus",
        created_at: "2026-01-01T00:00:00Z",
        last_sign_in_at: null,
        email_confirmed_at: "2026-01-02T00:00:00Z"
    }]);
    assert.equal(JSON.stringify(response.body).includes("must-not-be-returned"), false);
});
