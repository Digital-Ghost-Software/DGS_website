import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const webhookRoutePath = path.join(process.cwd(), "api", "stripe", "webhook.js");
const webhookRoute = await readFile(webhookRoutePath, "utf8");
const catarseRoutePath = path.join(process.cwd(), "api", "catarse", "yokai-tales.js");
const catarseRoute = await readFile(catarseRoutePath, "utf8");

test("Vercel expõe o webhook Stripe como função explícita no caminho aninhado", () => {
    assert.match(webhookRoute, /import\s+\{\s*handler\s*\}\s+from\s+["']\.\.\/\.\.\/server\/index\.js["']/);
    assert.match(webhookRoute, /export\s+default\s+handler/);
});

test("Vercel expõe a consulta da campanha Catarse como função no caminho público do widget", () => {
    assert.match(catarseRoute, /import\s+\{\s*handler\s*\}\s+from\s+["']\.\.\/\.\.\/server\/index\.js["']/);
    assert.match(catarseRoute, /export\s+default\s+handler/);
});
