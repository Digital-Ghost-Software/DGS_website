import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

test("README instructions match the current Supabase project and local setup", async () => {
    const readme = await readFile("README.md", "utf8");

    assert.match(readme, /database\/ddl\/new-project-schema\.sql/);
    assert.match(readme, /SUPABASE_URL/);
    assert.match(readme, /SUPABASE_PUBLISHABLE_KEY/);
    assert.match(readme, /npm ci/);
    assert.match(readme, /npm start/);
    assert.match(readme, /paginas\/recuperar-senha\.html/);
    assert.doesNotMatch(readme, /\.env\.example|database\/ddl\/rf-004-simulated-payments\.sql/);

    for (const [, target] of readme.matchAll(/\]\(([^)]+)\)/g)) {
        if (/^https?:\/\//i.test(target) || target.startsWith("#")) continue;
        await access(target);
    }
});
