import assert from "node:assert/strict";
import { createServer } from "node:http";
import test, { after, before } from "node:test";

const capturedRequests = [];
let apiServer;
let supabaseServer;
let apiBaseUrl;

const userIds = {
    "valid-test-token": "00000000-0000-4000-8000-000000000001",
    "second-test-token": "00000000-0000-4000-8000-000000000003"
};
const mockPayments = [
    {
        id: "00000000-0000-4000-8000-000000000002",
        user_id: userIds["valid-test-token"],
        edition: "plus",
        amount_brl: 40,
        payment_method: "pix",
        status: "simulated_approved",
        created_at: "2026-09-24T12:00:00.000Z"
    },
    {
        id: "00000000-0000-4000-8000-000000000004",
        user_id: userIds["second-test-token"],
        edition: "standard",
        amount_brl: 20,
        payment_method: "boleto",
        status: "simulated_approved",
        created_at: "2026-09-24T12:01:00.000Z"
    }
];
const mockDownloads = [
    {
        payment_id: mockPayments[0].id,
        user_id: userIds["valid-test-token"],
        release_version: "1.0",
        requested_at: "2026-09-24T12:10:00.000Z"
    }
];

function listen(server) {
    return new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(0, "127.0.0.1", () => {
            server.removeListener("error", reject);
            resolve(server.address().port);
        });
    });
}

function sendJson(response, status, value, headers = {}) {
    response.writeHead(status, { "Content-Type": "application/json", ...headers });
    response.end(JSON.stringify(value));
}

async function readBody(request) {
    let body = "";
    for await (const chunk of request) body += chunk.toString("utf8");
    return body ? JSON.parse(body) : {};
}

before(async () => {
    supabaseServer = createServer(async (request, response) => {
        const requestUrl = new URL(request.url, "http://localhost");
        const authorization = request.headers.authorization;
        capturedRequests.push({ method: request.method, path: requestUrl.pathname, search: requestUrl.search, authorization });

        if (requestUrl.pathname === "/auth/v1/user") {
            const token = authorization?.replace(/^Bearer\s+/i, "");
            const userId = userIds[token];
            if (!userId) {
                return sendJson(response, 401, { message: "Invalid token", code: "bad_jwt" });
            }
            return sendJson(response, 200, {
                id: userId,
                email: token === "valid-test-token" ? "tester@example.invalid" : "second@example.invalid",
                user_metadata: { full_name: token === "valid-test-token" ? "Test User" : "Second User" }
            });
        }

        if (requestUrl.pathname.startsWith("/auth/v1/admin/users/") && request.method === "DELETE") {
            if (request.headers.apikey !== "test-service-role") {
                return sendJson(response, 401, { message: "Invalid admin key" });
            }
            return sendJson(response, 200, { id: requestUrl.pathname.split("/").at(-1), deleted: true });
        }

        if (requestUrl.pathname === "/rest/v1/profiles" && request.method === "GET") {
            const token = authorization?.replace(/^Bearer\s+/i, "");
            const userId = userIds[token];
            if (!userId) return sendJson(response, 401, { message: "Invalid token" });
            return sendJson(response, 200, {
                user_id: userId,
                user_name: token === "valid-test-token" ? "Test User" : "Second User",
                user_foto: null,
                user_level: token === "valid-test-token" ? "plus" : "standard"
            });
        }

        if (requestUrl.pathname === "/rest/v1/profiles" && request.method === "PATCH") {
            const payload = await readBody(request);
            capturedRequests.at(-1).body = payload;
            return sendJson(response, 200, {
                user_name: payload.user_name,
                user_foto: null,
                user_level: "plus"
            });
        }

        if (requestUrl.pathname === "/rest/v1/simulated_payments" && request.method === "POST") {
            const payload = await readBody(request);
            const row = {
                id: "00000000-0000-4000-8000-000000000002",
                user_id: userIds[authorization?.replace(/^Bearer\s+/i, "")],
                edition: payload.edition,
                amount_brl: payload.edition === "plus" ? 40 : 20,
                payment_method: payload.payment_method,
                status: "simulated_approved",
                created_at: "2026-09-24T12:00:00.000Z"
            };
            capturedRequests.at(-1).body = payload;
            return sendJson(response, 201, row);
        }

        if (requestUrl.pathname === "/rest/v1/simulated_payments" && request.method === "GET") {
            const userId = userIds[authorization?.replace(/^Bearer\s+/i, "")];
            return sendJson(response, 200, mockPayments.filter((payment) => payment.user_id === userId));
        }

        if (requestUrl.pathname === "/rest/v1/game_downloads" && request.method === "GET") {
            const userId = userIds[authorization?.replace(/^Bearer\s+/i, "")];
            const paymentIds = new Set(mockPayments.filter((payment) => payment.user_id === userId).map((payment) => payment.id));
            return sendJson(response, 200, mockDownloads.filter((item) => paymentIds.has(item.payment_id)));
        }

        if (requestUrl.pathname === "/rest/v1/game_downloads" && request.method === "POST") {
            const payload = await readBody(request);
            const userId = userIds[authorization?.replace(/^Bearer\s+/i, "")];
            const ownedPayment = mockPayments.find((payment) => payment.id === payload.payment_id && payment.user_id === userId);
            capturedRequests.at(-1).body = payload;
            if (!ownedPayment) return sendJson(response, 403, { message: "Order does not belong to user", code: "42501" });
            return sendJson(response, 201, {
                payment_id: payload.payment_id,
                release_version: payload.release_version,
                requested_at: "2026-09-24T12:20:00.000Z"
            });
        }

        return sendJson(response, 404, { message: "Mock endpoint not found" });
    });

    const supabasePort = await listen(supabaseServer);
    process.env.SUPABASE_URL = `http://127.0.0.1:${supabasePort}`;
    process.env.SUPABASE_PUBLISHABLE_KEY = "test-publishable-key";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "";
    process.env.ALLOWED_ORIGINS = "";

    const { createLocalHandler } = await import("../../server/local.js");
    apiServer = createServer(createLocalHandler());
    const apiPort = await listen(apiServer);
    apiBaseUrl = `http://127.0.0.1:${apiPort}`;
});

after(async () => {
    await Promise.all([apiServer, supabaseServer].filter(Boolean).map((server) => new Promise((resolve) => server.close(resolve))));
    for (const key of ["SUPABASE_URL", "SUPABASE_PUBLISHABLE_KEY", "SUPABASE_SERVICE_ROLE_KEY", "ALLOWED_ORIGINS"]) {
        delete process.env[key];
    }
});

test("health endpoint is public and returns the expected status", async () => {
    const response = await fetch(`${apiBaseUrl}/api/health`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: "ok" });
});

test("public config returns only the Supabase URL and publishable key", async () => {
    const response = await fetch(`${apiBaseUrl}/api/config`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
        supabaseUrl: process.env.SUPABASE_URL,
        supabasePublishableKey: "test-publishable-key"
    });
});

test("local server serves the site and blocks private project files", async () => {
    const page = await fetch(`${apiBaseUrl}/paginas/download.html`);
    assert.equal(page.status, 200);
    const passwordRecoveryPage = await fetch(`${apiBaseUrl}/paginas/recuperar-senha.html`);
    assert.equal(passwordRecoveryPage.status, 200);
    const recoveryHtml = await passwordRecoveryPage.text();
    assert.match(recoveryHtml, /<form id="formRecuperacaoSenha">/);
    assert.match(recoveryHtml, /<form id="formRedefinirSenha" hidden>/);
    const stylesheet = await fetch(`${apiBaseUrl}/css/style.css`);
    assert.equal(stylesheet.status, 200);
    assert.match(await stylesheet.text(), /\.form-container form\[hidden\]\s*\{\s*display:\s*none\s*!important;/);
    assert.match(page.headers.get("content-type"), /text\/html/);
    assert.match(await page.text(), /Forma de pagamento simulada/);

    const loginPage = await fetch(`${apiBaseUrl}/paginas/login.html`);
    assert.equal(loginPage.status, 200);
    const loginHtml = await loginPage.text();
    assert.match(loginHtml, /class="btn-login active"/);
    assert.match(loginHtml, /id="logoutButton"[^>]*hidden/);

    const homePage = await fetch(`${apiBaseUrl}/`);
    assert.equal(homePage.status, 200);
    const homeHtml = await homePage.text();
    assert.match(homeHtml, /class="btn-login"/);
    assert.match(homeHtml, /id="logoutButton"[^>]*hidden/);

    const clientScript = await fetch(`${apiBaseUrl}/js/supabase-config.js`);
    assert.equal(clientScript.status, 200);

    const envFile = await fetch(`${apiBaseUrl}/.env`);
    assert.equal(envFile.status, 404);
    const serverSource = await fetch(`${apiBaseUrl}/server/index.js`);
    assert.equal(serverSource.status, 404);
});

test("profile rejects missing and invalid bearer tokens", async () => {
    const missing = await fetch(`${apiBaseUrl}/api/profile`);
    assert.equal(missing.status, 401);
    assert.equal((await missing.json()).code, "missing_bearer_token");

    const invalid = await fetch(`${apiBaseUrl}/api/profile`, {
        headers: { Authorization: "Bearer invalid-test-token" }
    });
    assert.equal(invalid.status, 401);
    const invalidBody = await invalid.json();
    assert.equal(invalidBody.code, "token_format_invalid");
    assert.equal(invalidBody.authStatus, 401);
});

test("profile identifies a rejected token from a different project without exposing its contents", async () => {
    const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
    const token = `${encode({ alg: "none", typ: "JWT" })}.${encode({
        iss: "https://other-project.supabase.co/auth/v1",
        exp: Math.floor(Date.now() / 1000) + 3600
    })}.test-signature`;
    const response = await fetch(`${apiBaseUrl}/api/profile`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), {
        error: "Sessão inválida. Entre novamente.",
        code: "session_project_mismatch",
        authStatus: 401,
        tokenDiagnostic: "session_project_mismatch"
    });
});

test("profile identifies an expired rejected session", async () => {
    const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
    const expectedIssuer = `${new URL(process.env.SUPABASE_URL).origin}/auth/v1`;
    const token = `${encode({ alg: "none", typ: "JWT" })}.${encode({
        iss: expectedIssuer,
        exp: Math.floor(Date.now() / 1000) - 60
    })}.test-signature`;
    const response = await fetch(`${apiBaseUrl}/api/profile`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), {
        error: "Sessão inválida. Entre novamente.",
        code: "session_expired",
        authStatus: 401,
        tokenDiagnostic: "session_expired"
    });
});

test("profile identifies rejected tokens whose issuer and expiry match the configured project", async () => {
    const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
    const expectedIssuer = `${new URL(process.env.SUPABASE_URL).origin}/auth/v1`;
    const token = `${encode({ alg: "none", typ: "JWT" })}.${encode({
        iss: expectedIssuer,
        exp: Math.floor(Date.now() / 1000) + 3600
    })}.test-signature`;
    const response = await fetch(`${apiBaseUrl}/api/profile`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    assert.equal(response.status, 401);
    assert.equal((await response.json()).code, "token_claims_match_but_rejected");
});

test("profile reports safe token claims when the auth provider returns a transport-style error", async () => {
    const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
    const token = `${encode({ alg: "none", typ: "JWT" })}.${encode({
        iss: `${new URL(process.env.SUPABASE_URL).origin}/auth/v1`,
        exp: Math.floor(Date.now() / 1000) + 3600
    })}.signature`;
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (resource, options) => {
        if (String(resource).includes("/auth/v1/user")) throw new TypeError("fetch failed");
        return originalFetch(resource, options);
    };
    try {
        const response = await originalFetch(`${apiBaseUrl}/api/profile`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const body = await response.json();
        assert.equal(body.code, "auth_provider_error");
        assert.equal(body.authStatus, 0);
        assert.equal(body.tokenDiagnostic, "token_claims_match_but_rejected");
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test("profile returns only the authenticated Supabase identity", async () => {
    const response = await fetch(`${apiBaseUrl}/api/profile`, {
        headers: { Authorization: "Bearer valid-test-token" }
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
        id: "00000000-0000-4000-8000-000000000001",
        email: "tester@example.invalid",
        user_name: "Test User",
        user_foto: null,
        user_level: "plus"
    });
    const profileRead = capturedRequests.findLast((entry) => entry.path === "/rest/v1/profiles" && entry.method === "GET");
    assert.equal(profileRead.authorization, "Bearer valid-test-token");
});

test("profile update validates the name and forwards only the editable field", async () => {
    const invalid = await fetch(`${apiBaseUrl}/api/profile`, {
        method: "PATCH",
        headers: { Authorization: "Bearer valid-test-token", "Content-Type": "application/json" },
        body: JSON.stringify({ user_name: "A", user_level: "plus", user_id: userIds["second-test-token"] })
    });
    assert.equal(invalid.status, 400);

    const response = await fetch(`${apiBaseUrl}/api/profile`, {
        method: "PATCH",
        headers: { Authorization: "Bearer valid-test-token", "Content-Type": "application/json" },
        body: JSON.stringify({ user_name: "  New Name  ", user_level: null, user_id: userIds["second-test-token"] })
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { user_name: "New Name", user_foto: null, user_level: "plus" });
    const update = capturedRequests.findLast((entry) => entry.path === "/rest/v1/profiles" && entry.method === "PATCH");
    assert.deepEqual(update.body, { user_name: "New Name" });
    assert.equal(update.authorization, "Bearer valid-test-token");
    assert.match(update.search, /user_id=eq\.00000000-0000-4000-8000-000000000001/);
});

test("order history and download history stay scoped to the authenticated token", async () => {
    const firstResponse = await fetch(`${apiBaseUrl}/api/payments`, {
        headers: { Authorization: "Bearer valid-test-token" }
    });
    assert.equal(firstResponse.status, 200);
    const firstHistory = await firstResponse.json();
    assert.deepEqual(firstHistory.payments.map((payment) => payment.id), [mockPayments[0].id]);
    assert.deepEqual(firstHistory.downloads.map((download) => download.payment_id), [mockPayments[0].id]);

    const secondResponse = await fetch(`${apiBaseUrl}/api/payments`, {
        headers: { Authorization: "Bearer second-test-token" }
    });
    assert.equal(secondResponse.status, 200);
    const secondHistory = await secondResponse.json();
    assert.deepEqual(secondHistory.payments.map((payment) => payment.id), [mockPayments[1].id]);
    assert.deepEqual(secondHistory.downloads, []);

    const databaseReads = capturedRequests.filter((entry) => entry.path === "/rest/v1/simulated_payments" && entry.method === "GET");
    assert.equal(databaseReads.at(-2).authorization, "Bearer valid-test-token");
    assert.equal(databaseReads.at(-1).authorization, "Bearer second-test-token");
});

test("payment creation validates edition and method and forwards only those choices", async () => {
    const invalid = await fetch(`${apiBaseUrl}/api/payments`, {
        method: "POST",
        headers: { Authorization: "Bearer valid-test-token", "Content-Type": "application/json" },
        body: JSON.stringify({ edition: "premium" })
    });
    assert.equal(invalid.status, 400);
    assert.equal((await invalid.json()).error, "Edição inválida. Escolha Standard ou Plus.");

    const invalidMethod = await fetch(`${apiBaseUrl}/api/payments`, {
        method: "POST",
        headers: { Authorization: "Bearer valid-test-token", "Content-Type": "application/json" },
        body: JSON.stringify({ edition: "standard", payment_method: "cash" })
    });
    assert.equal(invalidMethod.status, 400);
    assert.equal((await invalidMethod.json()).error, "Escolha uma forma de pagamento válida.");

    const response = await fetch(`${apiBaseUrl}/api/payments`, {
        method: "POST",
        headers: { Authorization: "Bearer valid-test-token", "Content-Type": "application/json" },
        body: JSON.stringify({
            edition: "plus",
            payment_method: "debito",
            amount_brl: 0,
            user_id: "attacker-controlled-user",
            status: "paid"
        })
    });

    assert.equal(response.status, 201);
    const order = await response.json();
    assert.equal(order.amount_brl, 40);
    assert.equal(order.payment_method, "debito");
    assert.equal(order.status, "simulated_approved");
    const insertRequest = capturedRequests.findLast((entry) => entry.path === "/rest/v1/simulated_payments" && entry.method === "POST");
    assert.deepEqual(insertRequest.body, { edition: "plus", payment_method: "debito" });
});

test("the API rejects requests from a foreign origin", async () => {
    const response = await fetch(`${apiBaseUrl}/api/health`, {
        headers: { Origin: "https://untrusted.example" }
    });
    assert.equal(response.status, 403);
});

test("the API accepts a matching same-origin request", async () => {
    const apiHost = new URL(apiBaseUrl).host;
    const response = await fetch(`${apiBaseUrl}/api/health`, {
        headers: {
            Origin: `http://${apiHost}`,
            "X-Forwarded-Host": apiHost,
            "X-Forwarded-Proto": "http"
        }
    });
    assert.equal(response.status, 200);
});

test("the local HTTP server accepts its own origin without proxy headers", async () => {
    const apiHost = new URL(apiBaseUrl).host;
    const response = await fetch(`${apiBaseUrl}/api/health`, {
        headers: { Origin: `http://${apiHost}` }
    });
    assert.equal(response.status, 200);
});

test("download requests require an order ID and can only use an owned order", async () => {
    const invalid = await fetch(`${apiBaseUrl}/api/downloads`, {
        method: "POST",
        headers: { Authorization: "Bearer valid-test-token", "Content-Type": "application/json" },
        body: JSON.stringify({ payment_id: "not-a-uuid" })
    });
    assert.equal(invalid.status, 400);

    const denied = await fetch(`${apiBaseUrl}/api/downloads`, {
        method: "POST",
        headers: { Authorization: "Bearer valid-test-token", "Content-Type": "application/json" },
        body: JSON.stringify({ payment_id: mockPayments[1].id, release_version: "forged" })
    });
    assert.equal(denied.status, 403);

    const accepted = await fetch(`${apiBaseUrl}/api/downloads`, {
        method: "POST",
        headers: { Authorization: "Bearer valid-test-token", "Content-Type": "application/json" },
        body: JSON.stringify({ payment_id: mockPayments[0].id, release_version: "forged" })
    });
    assert.equal(accepted.status, 201);
    const download = await accepted.json();
    assert.equal(download.payment_id, mockPayments[0].id);
    assert.equal(download.release_version, "1.0");
    const downloadInsert = capturedRequests.findLast((entry) => entry.path === "/rest/v1/game_downloads" && entry.method === "POST");
    assert.deepEqual(downloadInsert.body, { payment_id: mockPayments[0].id, release_version: "1.0" });
});

test("account deletion remains unavailable when no service role is configured", async () => {
    const response = await fetch(`${apiBaseUrl}/api/account/delete`, {
        method: "POST",
        headers: { Authorization: "Bearer valid-test-token" }
    });
    assert.equal(response.status, 503);
    const result = await response.json();
    assert.equal(result.error, "A exclusão da conta não está configurada no servidor.");
    assert.equal(result.code, "ACCOUNT_DELETION_UNAVAILABLE");
});

test("account deletion uses the service role only on the server and deletes the authenticated identity", async () => {
    const originalServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role";
    const { handler } = await import(`../../server/index.js?admin-test=${Date.now()}`);
    const adminServer = createServer(handler);
    const adminPort = await listen(adminServer);
    try {
        const response = await fetch(`http://127.0.0.1:${adminPort}/api/account/delete`, {
            method: "POST",
            headers: { Authorization: "Bearer valid-test-token" }
        });
        assert.equal(response.status, 200);
        assert.deepEqual(await response.json(), { deleted: true });
        const adminRequest = capturedRequests.findLast((entry) => entry.path.startsWith("/auth/v1/admin/users/") && entry.method === "DELETE");
        assert.equal(adminRequest.path, `/auth/v1/admin/users/${userIds["valid-test-token"]}`);
        assert.equal(adminRequest.authorization, "Bearer test-service-role");
    } finally {
        await new Promise((resolve) => adminServer.close(resolve));
        if (originalServiceRole === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
        else process.env.SUPABASE_SERVICE_ROLE_KEY = originalServiceRole;
    }
});
