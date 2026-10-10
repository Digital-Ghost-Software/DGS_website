import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("interactive controls expose a visible keyboard focus indicator", async () => {
    const stylesheet = await readFile("css/style.css", "utf8");

    assert.match(stylesheet, /:where\(a, button, input, select, textarea, \[tabindex\]\):focus-visible\s*\{[^}]*outline:\s*3px solid #ff9b42;[^}]*outline-offset:\s*3px;/s);
});
