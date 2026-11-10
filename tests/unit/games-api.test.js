import assert from "node:assert/strict";
import test from "node:test";
import { createGamesHandler } from "../../server/routes/games.js";

const game = {
    id: "6f4c1a2b-2c3d-4e5f-8a9b-0c1d2e3f4a5b",
    name: "Jogo da equipe",
    url: "https://example.com/game",
    image_path: "00000000-0000-4000-8000-000000000001/00000000-0000-4000-8000-000000000002.png",
    created_at: "2026-10-20T12:00:00Z"
};
const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

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
            capture.order = { column, options };
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
            return { data: true, error: null };
        },
        storage: {
            from(bucket) {
                capture.bucket = bucket;
                return {
                    getPublicUrl(path) {
                        capture.publicImagePath = path;
                        return { data: { publicUrl: `https://storage.example/${bucket}/${path}` } };
                    },
                    async upload(path, bytes, options) {
                        capture.upload = { path, bytes, options };
                        return { error: null };
                    },
                    async remove(paths) {
                        capture.removedPaths = paths;
                        return { error: null };
                    }
                };
            }
        }
    };
}

function setup({ result = { data: game, error: null }, auth = { user: { id: "00000000-0000-4000-8000-000000000001" } } } = {}) {
    const capture = {};
    const client = createClient(result, capture);
    const handler = createGamesHandler({
        authenticate: async () => auth.error ? auth : { ...auth, client },
        publicClient: client,
        readJson: async (request) => request.body,
        sendJson: (response, status, body) => Object.assign(response, { status, body })
    });
    return { handler, capture };
}

function request(method, path = "/api/games", body) {
    return {
        method,
        url: path,
        headers: { authorization: "Bearer token" },
        body
    };
}

test("GET lists games publicly and returns public image URLs", async () => {
    const { handler, capture } = setup({ result: { data: [game], error: null } });
    const response = {};
    const anonymousRequest = request("GET");
    anonymousRequest.headers = {};

    await handler(anonymousRequest, response);

    assert.equal(response.status, 200);
    assert.equal(response.body.is_admin, false);
    assert.equal(response.body.games[0].image_url, `https://storage.example/other-games/${game.image_path}`);
    assert.equal(capture.table, "other_games");
    assert.deepEqual(capture.order, { column: "created_at", options: { ascending: false } });
});

test("POST validates and creates a game card", async () => {
    const { handler, capture } = setup();
    const response = {};

    await handler(request("POST", "/api/games", game), response);

    assert.equal(response.status, 201);
    assert.deepEqual(capture.payload, { name: game.name, url: game.url, image_path: game.image_path });
});

test("PUT updates a game card by UUID", async () => {
    const { handler, capture } = setup();
    const response = {};

    await handler(request("PUT", `/api/games?id=${game.id}`, game), response);

    assert.equal(response.status, 200);
    assert.equal(capture.operation, "update");
    assert.deepEqual(capture.filter, { column: "id", value: game.id });
});

test("DELETE removes a game and its image", async () => {
    const { handler, capture } = setup({
        result: { data: { id: game.id, image_path: game.image_path }, error: null }
    });
    const response = {};

    await handler(request("DELETE", `/api/games?id=${game.id}`), response);

    assert.equal(response.status, 200);
    assert.deepEqual(response.body, { deleted: true });
    assert.deepEqual(capture.removedPaths, [game.image_path]);
});

test("invalid game data is rejected before a database write", async () => {
    const { handler, capture } = setup();
    const response = {};

    await handler(request("POST", "/api/games", { ...game, url: "javascript:alert(1)" }), response);

    assert.equal(response.status, 400);
    assert.match(response.body.error, /HTTP ou HTTPS/);
    assert.equal(capture.operation, undefined);
});

test("image upload validates the file signature and stores it in the public bucket", async () => {
    const { handler, capture } = setup();
    const response = {};

    await handler(request("POST", "/api/games?action=upload-image", {
        content_type: "image/png",
        image_data: png.toString("base64")
    }), response);

    assert.equal(response.status, 201);
    assert.match(response.body.image_path, /^00000000-0000-4000-8000-000000000001\/[0-9a-f-]+\.png$/i);
    assert.equal(capture.bucket, "other-games");
    assert.deepEqual(capture.upload.bytes, png);
});

test("image upload rejects content that does not match its declared type", async () => {
    const { handler, capture } = setup();
    const response = {};

    await handler(request("POST", "/api/games?action=upload-image", {
        content_type: "image/png",
        image_data: Buffer.from("not an image").toString("base64")
    }), response);

    assert.equal(response.status, 400);
    assert.equal(capture.upload, undefined);
});

test("write operations reject unauthenticated requests", async () => {
    const { handler, capture } = setup({
        auth: { error: "Autenticação necessária.", status: 401, code: "missing_bearer_token" }
    });
    const response = {};

    await handler(request("POST", "/api/games", game), response);

    assert.equal(response.status, 401);
    assert.equal(capture.operation, undefined);
});

test("database row-level security rejects writes from authenticated non-admins", async () => {
    const { handler, capture } = setup({
        result: { data: null, error: { code: "42501" } }
    });
    const response = {};

    await handler(request("POST", "/api/games", game), response);

    assert.equal(response.status, 403);
    assert.match(response.body.error, /Somente administradores/);
    assert.equal(capture.operation, "insert");
});
