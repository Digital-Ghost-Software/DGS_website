import assert from "node:assert/strict";
import test from "node:test";
import { loadSupabaseConfig } from "../../js/supabase-config.js";

test("client loads public Supabase config from same-origin API without returning secrets", async () => {
    const originalFetch = globalThis.fetch;
    let requestedUrl;
    globalThis.fetch = async (url, options) => {
        requestedUrl = url;
        assert.deepEqual(options, { cache: "no-store" });
        return new Response(JSON.stringify({
            supabaseUrl: "https://project.example.supabase.co",
            supabasePublishableKey: "sb_publishable_test_value"
        }), { status: 200, headers: { "Content-Type": "application/json" } });
    };

    try {
        const config = await loadSupabaseConfig();
        assert.equal(requestedUrl, "/api/config");
        assert.deepEqual(config, {
            SUPABASE_URL: "https://project.example.supabase.co",
            SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test_value"
        });
        assert.equal(Object.hasOwn(config, "serviceRoleKey"), false);
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test("client rejects incomplete public Supabase configuration", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response(JSON.stringify({ supabaseUrl: "https://project.example.supabase.co" }), { status: 200 });
    try {
        await assert.rejects(loadSupabaseConfig(), /configuração do serviço está incompleta/);
    } finally {
        globalThis.fetch = originalFetch;
    }
});
