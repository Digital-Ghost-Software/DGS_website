import assert from "node:assert/strict";
import test from "node:test";
import { createUpdatesHandler } from "../../server/routes/updates.js";

const update = {
    id: "6f4c1a2b-2c3d-4e5f-8a9b-0c1d2e3f4a5b",
    title: "Atualização",
    version: "1.2.0",
    release_date: "2026-10-20",
    category: "Novidades",
    description: "Descrição da atualização.",
    created_at: "2026-10-20T12:00:00Z"
};

function createClient(result, capture = {}) {
    const query = {
        from(table) {
            capture.table = table;
            return this;
        },
        select(fields) {
            capture.fields = fields;
            return this;
        },
        order(column, options) {
            (capture.order ||= []).push({ column, options });
            return this;
        },
        insert(payload) {
            capture.operation = "insert";
            capture.payload = payload;
            return this;
        },
        update(payload) {
            capture.operation = "update";
            capture.payload = payload;
            return this;
        },
        delete() {
            capture.operation = "delete";
            return this;
        },
        eq(column, value) {
            capture.filter = { column, value };
            return this;
        },
        single() {
            return Promise.resolve(result);
        },
        maybeSingle() {
            return Promise.resolve(result);
        },
        then(resolve, reject) {
            return Promise.resolve(result).then(resolve, reject);
        }
    };
    return {
        from: query.from.bind(query),
        rpc: async (name) => {
            capture.rpc = name;
            return result;
        }
    };
}

function setup({ result = { data: update, error: null }, isAdmin = true } = {}) {
    const capture = {};
    const client = createClient(result, capture);
    const authCalls = [];
    const handler = createUpdatesHandler({
        authenticate: async (request) => {
            authCalls.push(request);
            return { client, user: { id: "admin-id" } };
        },
        publicClient: client,
        readJson: async (request) => request.body,
        sendJson: (response, status, body) => Object.assign(response, { status, body }),
    });
    client.rpc = async (name) => {
        capture.rpc = name;
        return { data: isAdmin, error: result.error };
    };
    return { handler, capture, authCalls };
}

function request(method, path = "/api/updates", body) {
    return {
        method,
        url: path,
        headers: { authorization: "Bearer test-token" },
        body
    };
}

test("GET lists notes and returns the server-verified administrator status", async () => {
    const { handler, capture, authCalls } = setup({
        result: { data: [update], error: null },
        isAdmin: true
    });
    const response = {};

    await handler(request("GET"), response);

    assert.equal(response.status, 200);
    assert.deepEqual(response.body, { updates: [update], is_admin: true });
    assert.equal(capture.rpc, "is_feedback_admin");
    assert.equal(capture.table, "game_updates");
    assert.equal(authCalls.length, 1);
});

test("GET can list notes publicly without authenticating a browser", async () => {
    const { handler, capture, authCalls } = setup({
        result: { data: [update], error: null },
        isAdmin: false
    });
    const response = {};
    const anonymousRequest = request("GET");
    anonymousRequest.headers = {};

    await handler(anonymousRequest, response);

    assert.equal(response.status, 200);
    assert.deepEqual(response.body, { updates: [update], is_admin: false });
    assert.equal(capture.rpc, undefined);
    assert.equal(authCalls.length, 0);
});

test("POST validates and creates a note", async () => {
    const { handler, capture, authCalls } = setup();
    const response = {};

    await handler(request("POST", "/api/updates", update), response);

    assert.equal(response.status, 201);
    assert.equal(response.body, update);
    assert.equal(capture.operation, "insert");
    assert.deepEqual(capture.payload, {
        title: update.title,
        version: update.version,
        release_date: update.release_date,
        category: update.category,
        description: update.description
    });
    assert.equal(authCalls.length, 1);
});

test("PUT updates a note by UUID", async () => {
    const { handler, capture } = setup();
    const response = {};

    await handler(request("PUT", `/api/updates?id=${update.id}`, update), response);

    assert.equal(response.status, 200);
    assert.equal(response.body, update);
    assert.equal(capture.operation, "update");
    assert.deepEqual(capture.filter, { column: "id", value: update.id });
});

test("DELETE removes a note by UUID", async () => {
    const { handler, capture } = setup({ result: { data: { id: update.id }, error: null } });
    const response = {};

    await handler(request("DELETE", `/api/updates?id=${update.id}`), response);

    assert.equal(response.status, 200);
    assert.deepEqual(response.body, { deleted: true });
    assert.equal(capture.operation, "delete");
    assert.deepEqual(capture.filter, { column: "id", value: update.id });
});

test("invalid note data is rejected before any database write", async () => {
    const { handler, capture } = setup();
    const response = {};

    await handler(request("POST", "/api/updates", { ...update, release_date: "2026-02-30" }), response);

    assert.equal(response.status, 400);
    assert.match(response.body.error, /data de atualização válida/);
    assert.equal(capture.operation, undefined);
});
