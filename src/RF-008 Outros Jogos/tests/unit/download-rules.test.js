import assert from "node:assert/strict";
import test from "node:test";
import { getDownloadLinkState } from "../../js/download-rules.js";

test("missing game release keeps download disabled and does not invent a URL", () => {
    assert.deepEqual(getDownloadLinkState(""), {
        available: false,
        href: "#download-not-ready",
        label: "ARQUIVO DO JOGO PENDENTE"
    });
});

test("a configured release is exposed as the download target", () => {
    assert.deepEqual(getDownloadLinkState("https://downloads.example/game.zip"), {
        available: true,
        href: "https://downloads.example/game.zip",
        label: "BAIXAR JOGO"
    });
});
