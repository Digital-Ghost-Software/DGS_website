import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const webhookRoutePath = path.join(process.cwd(), "api", "stripe", "webhook.js");
const webhookRoute = await readFile(webhookRoutePath, "utf8");

test("Vercel expõe o webhook Stripe como função explícita no caminho aninhado", () => {
    assert.match(webhookRoute, /import\s+\{\s*handler\s*\}\s+from\s+["']\.\.\/\.\.\/server\/index\.js["']/);
    assert.match(webhookRoute, /export\s+default\s+handler/);
});
