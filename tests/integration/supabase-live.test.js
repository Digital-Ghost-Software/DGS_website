import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "../../js/supabase-config.js";
import { handler } from "../../server/index.js";

const liveRunEnabled = process.env.RUN_SUPABASE_LIVE_TESTS === "true";
const supabaseUrl = process.env.SUPABASE_URL || SUPABASE_URL;
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY || SUPABASE_PUBLISHABLE_KEY;

test("Supabase real aplica preços, titularidade, isolamento RLS e valida pedidos de download", {
    skip: !liveRunEnabled
}, async () => {
    const clientOptions = { auth: { persistSession: false, autoRefreshToken: false } };
    const accountA = createClient(supabaseUrl, publishableKey, clientOptions);
    const accountB = createClient(supabaseUrl, publishableKey, clientOptions);

    const loginA = await accountA.auth.signInWithPassword({
        email: process.env.SUPABASE_TEST_USER_A_EMAIL,
        password: process.env.SUPABASE_TEST_USER_A_PASSWORD
    });
    assert.ok(
        !loginA.error && loginA.data.user?.id,
        `A conta de teste A não autenticou. Confira a configuração local e confirmação de e-mail (HTTP ${loginA.error?.status ?? "indisponível"}; código ${loginA.error?.code ?? "indisponível"}).`
    );

    const loginB = await accountB.auth.signInWithPassword({
        email: process.env.SUPABASE_TEST_USER_B_EMAIL,
        password: process.env.SUPABASE_TEST_USER_B_PASSWORD
    });
    assert.ok(
        !loginB.error && loginB.data.user?.id,
        `A conta de teste B não autenticou. Confira a configuração local e confirmação de e-mail (HTTP ${loginB.error?.status ?? "indisponível"}; código ${loginB.error?.code ?? "indisponível"}).`
    );
    assert.notEqual(loginA.data.user.id, loginB.data.user.id, "As duas contas de teste precisam ser identidades diferentes.");

    const apiServer = createServer(handler);
    await new Promise((resolve) => apiServer.listen(0, "127.0.0.1", resolve));
    const apiAddress = apiServer.address();
    const apiBaseUrl = `http://127.0.0.1:${apiAddress.port}`;
    try {
        const profileResponse = await fetch(`${apiBaseUrl}/api/profile`, {
            headers: { Authorization: `Bearer ${loginA.data.session.access_token}` }
        });
        assert.equal(profileResponse.status, 200, "A API deve aceitar a sessão Auth válida.");
        const profile = await profileResponse.json();
        assert.equal(profile.id, loginA.data.user.id);
        assert.equal(profile.email, loginA.data.user.email);
        assert.equal(typeof profile.full_name, "string");

        const anonymousProfileResponse = await fetch(`${apiBaseUrl}/api/profile`);
        assert.equal(anonymousProfileResponse.status, 401, "A API não deve expor perfil sem sessão.");
    } finally {
        await new Promise((resolve, reject) => apiServer.close((error) => error ? reject(error) : resolve()));
    }

    const fakeTimestamp = "2000-01-01T00:00:00.000Z";
    const { data: orderA, error: orderAError } = await accountA
        .from("simulated_payments")
        .insert({
            edition: "standard",
            user_id: loginB.data.user.id,
            amount_brl: 999,
            status: "paid",
            created_at: fakeTimestamp
        })
        .select("id, user_id, edition, amount_brl, status, created_at")
        .single();
    assert.ok(!orderAError && orderA, "Não foi possível criar o pedido de teste Standard.");
    assert.equal(orderA.user_id, loginA.data.user.id);
    assert.equal(orderA.edition, "standard");
    assert.equal(Number(orderA.amount_brl), 20);
    assert.equal(orderA.status, "simulated_approved");
    assert.ok(Date.parse(orderA.created_at) > Date.parse(fakeTimestamp));

    const { data: orderB, error: orderBError } = await accountB
        .from("simulated_payments")
        .insert({ edition: "plus" })
        .select("id, user_id, edition, amount_brl, status, created_at")
        .single();
    assert.ok(!orderBError && orderB, "Não foi possível criar o pedido de teste Plus.");
    assert.equal(orderB.user_id, loginB.data.user.id);
    assert.equal(Number(orderB.amount_brl), 40);
    assert.equal(orderB.status, "simulated_approved");

    const { data: visibleToA, error: readAError } = await accountA
        .from("simulated_payments")
        .select("id")
        .in("id", [orderA.id, orderB.id]);
    assert.ok(!readAError, "A conta A não conseguiu consultar os próprios pedidos.");
    assert.deepEqual(visibleToA.map((order) => order.id), [orderA.id]);

    const { data: visibleToB, error: readBError } = await accountB
        .from("simulated_payments")
        .select("id")
        .in("id", [orderA.id, orderB.id]);
    assert.ok(!readBError, "A conta B não conseguiu consultar os próprios pedidos.");
    assert.deepEqual(visibleToB.map((order) => order.id), [orderB.id]);

    const { data: ownDownload, error: ownDownloadError } = await accountA
        .from("game_downloads")
        .insert({ payment_id: orderA.id, release_version: "teste-integracao" })
        .select("payment_id, user_id, requested_at")
        .single();
    assert.ok(!ownDownloadError && ownDownload, "A conta A não conseguiu registrar o download do próprio pedido.");
    assert.equal(ownDownload.payment_id, orderA.id);
    assert.equal(ownDownload.user_id, loginA.data.user.id);

    const { data: foreignDownload, error: foreignDownloadError } = await accountB
        .from("game_downloads")
        .insert({ payment_id: orderA.id, release_version: "teste-integracao" })
        .select("payment_id")
        .single();
    assert.ok(foreignDownloadError && !foreignDownload, "A conta B não deve solicitar download do pedido da conta A.");

    const [signOutA, signOutB] = await Promise.all([
        accountA.auth.signOut(),
        accountB.auth.signOut()
    ]);
    assert.ok(!signOutA.error && !signOutB.error, "O logout deve encerrar as sessões das duas contas.");
    const [sessionA, sessionB] = await Promise.all([
        accountA.auth.getSession(),
        accountB.auth.getSession()
    ]);
    assert.equal(sessionA.data.session, null);
    assert.equal(sessionB.data.session, null);
});
