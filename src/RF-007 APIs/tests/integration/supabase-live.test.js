import assert from "node:assert/strict";
import Stripe from "stripe";
import { createServer } from "node:http";
import test from "node:test";
import { createClient } from "@supabase/supabase-js";

const liveRunEnabled = process.env.RUN_SUPABASE_LIVE_TESTS === "true";
const supabaseUrl = process.env.SUPABASE_URL;
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

test("Supabase real integra pedidos pendentes, webhook assinado, RLS e autorização de downloads", {
    skip: !liveRunEnabled
}, async () => {
    assert.ok(supabaseUrl && publishableKey, "Configure URL e chave publicável do novo projeto no .env local.");
    assert.ok(supabaseSecretKey, "Configure a chave secreta do Supabase somente no .env local.");
    const { createHandler } = await import("../../server/index.js");
    const clientOptions = { auth: { persistSession: false, autoRefreshToken: false } };
    const accountA = createClient(supabaseUrl, publishableKey, clientOptions);
    const accountB = createClient(supabaseUrl, publishableKey, clientOptions);
    const adminClient = createClient(supabaseUrl, supabaseSecretKey, clientOptions);

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

    const stripeVerifier = new Stripe("sk_test_live_integration_placeholder");
    const webhookSecret = "whsec_live_integration_test_secret";
    const checkoutSessions = [];
    let sessionSequence = 1;
    const stripeClient = {
        checkout: {
            sessions: {
                create: async (params) => {
                    checkoutSessions.push(params);
                    const id = `cs_test_live_${sessionSequence++}`;
                    return { id, url: `https://checkout.stripe.com/c/pay/${id}` };
                }
            }
        },
        webhooks: stripeVerifier.webhooks
    };
    const apiHandler = createHandler({
        stripeClient,
        adminClient,
        webhookSecret,
        publicAppUrl: "https://local-test.example"
    });
    const apiServer = createServer(apiHandler);
    await new Promise((resolve, reject) => {
        apiServer.once("error", reject);
        apiServer.listen(0, "127.0.0.1", resolve);
    });
    const apiBaseUrl = `http://127.0.0.1:${apiServer.address().port}`;

    const createOrder = async (client, accessToken, edition, paymentMethod) => {
        // Reuse an interrupted run's pending order so retries do not accumulate test rows.
        const existing = await client.from("simulated_payments")
            .select("id, user_id, edition, amount_brl, payment_method, status, created_at")
            .eq("edition", edition)
            .eq("payment_method", paymentMethod)
            .eq("status", "pending")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
        assert.ok(!existing.error, "A conta deve consultar seus próprios pedidos pendentes.");
        if (existing.data) {
            return { ...existing.data, reused: true };
        }

        const response = await fetch(`${apiBaseUrl}/api/payments`, {
            method: "POST",
            headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
            body: JSON.stringify({ edition, payment_method: paymentMethod, amount_brl: 0, status: "paid" })
        });
        assert.equal(response.status, 201, "A API deve preparar um pedido de teste para a conta autenticada.");
        const order = await response.json();
        assert.equal(order.status, "pending");
        assert.equal(order.amount_brl, edition === "plus" ? 40 : 20);
        assert.match(order.checkout_url, /^https:\/\/checkout\.stripe\.com\//);
        return { ...order, reused: false };
    };

    const sendStripeEvent = async (event, { invalidSignature = false } = {}) => {
        const payload = JSON.stringify(event);
        const signature = invalidSignature
            ? "t=0,v1=invalid"
            : stripeVerifier.webhooks.generateTestHeaderString({ payload, secret: webhookSecret });
        return fetch(`${apiBaseUrl}/api/stripe/webhook`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Stripe-Signature": signature },
            body: payload
        });
    };

    const paymentEvent = (order, eventType, paymentStatus) => ({
        id: `evt_live_test_${order.id}_${eventType}`,
        object: "event",
        type: eventType,
        data: {
            object: {
                id: "cs_test_live_event",
                object: "checkout.session",
                client_reference_id: order.id,
                metadata: { order_id: order.id },
                payment_status: paymentStatus
            }
        }
    });

    try {
        const profileResponse = await fetch(`${apiBaseUrl}/api/profile`, {
            headers: { Authorization: `Bearer ${loginA.data.session.access_token}` }
        });
        assert.equal(profileResponse.status, 200, "A API deve aceitar a sessão Auth válida.");
        const profile = await profileResponse.json();
        assert.equal(profile.id, loginA.data.user.id);
        assert.equal(profile.email, loginA.data.user.email);
        assert.equal(typeof profile.user_name, "string");
        assert.equal(profile.user_foto, "/imagens/user-img-default.jpg");
        assert.ok([null, "standard", "plus"].includes(profile.user_level));

        const anonymousProfileResponse = await fetch(`${apiBaseUrl}/api/profile`);
        assert.equal(anonymousProfileResponse.status, 401, "A API não deve expor perfil sem sessão.");

        const orderA = await createOrder(accountA, loginA.data.session.access_token, "standard", "pix");
        const orderAPlus = await createOrder(accountA, loginA.data.session.access_token, "plus", "credito");
        const orderB = await createOrder(accountB, loginB.data.session.access_token, "plus", "debito");
        assert.equal(orderA.amount_brl, 20);
        assert.equal(orderAPlus.amount_brl, 40);
        assert.equal(orderAPlus.payment_method, "credito");
        assert.equal(orderB.payment_method, "debito");
        const [ordersVisibleToA, ordersVisibleToB] = await Promise.all([
            accountA.from("simulated_payments").select("id, user_id").in("id", [orderA.id, orderAPlus.id, orderB.id]),
            accountB.from("simulated_payments").select("id, user_id").in("id", [orderA.id, orderAPlus.id, orderB.id])
        ]);
        assert.ok(!ordersVisibleToA.error && !ordersVisibleToB.error);
        assert.deepEqual(new Set(ordersVisibleToA.data.map((order) => order.id)), new Set([orderA.id, orderAPlus.id]));
        assert.deepEqual(new Set(ordersVisibleToB.data.map((order) => order.id)), new Set([orderB.id]));
        assert.ok(ordersVisibleToA.data.every((order) => order.user_id === loginA.data.user.id));
        assert.ok(ordersVisibleToB.data.every((order) => order.user_id === loginB.data.user.id));
        const newlyCreated = [orderA, orderAPlus, orderB].filter((order) => !order.reused);
        assert.deepEqual(
            checkoutSessions.map((session) => session.payment_method_types),
            newlyCreated.map((order) => [["credito", "debito"].includes(order.payment_method) ? "card" : order.payment_method])
        );
        assert.deepEqual(
            checkoutSessions.map((session) => session.line_items[0].price_data.unit_amount),
            newlyCreated.map((order) => order.amount_brl * 100)
        );

        const unauthenticatedInsert = await accountA.from("simulated_payments")
            .insert({ edition: "standard", payment_method: "pix" });
        assert.ok(unauthenticatedInsert.error, "O navegador não deve criar pedidos diretamente no banco.");

        const pendingDownload = await fetch(`${apiBaseUrl}/api/downloads`, {
            method: "POST",
            headers: { Authorization: `Bearer ${loginA.data.session.access_token}`, "Content-Type": "application/json" },
            body: JSON.stringify({ payment_id: orderA.id })
        });
        assert.equal(pendingDownload.status, 403, "Pedido pendente não deve liberar download.");

        const completedUnpaid = await sendStripeEvent(paymentEvent(orderA, "checkout.session.completed", "unpaid"));
        assert.equal(completedUnpaid.status, 200);
        const stillPending = await accountA.from("simulated_payments").select("status").eq("id", orderA.id).single();
        assert.equal(stillPending.data.status, "pending", "Evento completed não pago não deve liberar o pedido.");

        const invalidSignature = await sendStripeEvent(paymentEvent(orderA, "checkout.session.completed", "paid"), { invalidSignature: true });
        assert.equal(invalidSignature.status, 400, "Webhook sem assinatura válida deve ser rejeitado.");
        const unchangedOrder = await accountA.from("simulated_payments").select("status").eq("id", orderA.id).single();
        assert.equal(unchangedOrder.data.status, "pending");

        const paidStandard = await sendStripeEvent(paymentEvent(orderA, "checkout.session.completed", "paid"));
        assert.equal(paidStandard.status, 200);
        const standardOrder = await accountA.from("simulated_payments").select("user_id, amount_brl, status").eq("id", orderA.id).single();
        assert.equal(standardOrder.data.status, "paid");
        assert.equal(standardOrder.data.user_id, loginA.data.user.id);
        assert.equal(Number(standardOrder.data.amount_brl), 20);

        const paidPlus = await sendStripeEvent(paymentEvent(orderAPlus, "checkout.session.async_payment_succeeded", "paid"));
        assert.equal(paidPlus.status, 200);
        const plusOrder = await accountA.from("simulated_payments").select("status").eq("id", orderAPlus.id).single();
        assert.equal(plusOrder.data.status, "paid");
        const profileAfterPurchase = await accountA.from("profiles").select("user_level").single();
        assert.equal(profileAfterPurchase.data.user_level, "plus");

        const failedPayment = await sendStripeEvent(paymentEvent(orderB, "checkout.session.async_payment_failed", "unpaid"));
        assert.equal(failedPayment.status, 200);
        const failedOrder = await accountB.from("simulated_payments").select("status").eq("id", orderB.id).single();
        assert.equal(failedOrder.data.status, "failed");

        const ownDownload = await fetch(`${apiBaseUrl}/api/downloads`, {
            method: "POST",
            headers: { Authorization: `Bearer ${loginA.data.session.access_token}`, "Content-Type": "application/json" },
            body: JSON.stringify({ payment_id: orderAPlus.id })
        });
        assert.equal(ownDownload.status, 201, "A conta A pode solicitar o download do próprio pedido pago.");

        const foreignDownload = await fetch(`${apiBaseUrl}/api/downloads`, {
            method: "POST",
            headers: { Authorization: `Bearer ${loginB.data.session.access_token}`, "Content-Type": "application/json" },
            body: JSON.stringify({ payment_id: orderAPlus.id })
        });
        assert.equal(foreignDownload.status, 403, "A conta B não pode solicitar download do pedido da conta A.");

        const failedDownload = await fetch(`${apiBaseUrl}/api/downloads`, {
            method: "POST",
            headers: { Authorization: `Bearer ${loginB.data.session.access_token}`, "Content-Type": "application/json" },
            body: JSON.stringify({ payment_id: orderB.id })
        });
        assert.equal(failedDownload.status, 403, "Pedido falho não deve liberar download.");

        const [visibleToA, visibleToB] = await Promise.all([
            accountA.from("simulated_payments").select("id, status").in("id", [orderA.id, orderAPlus.id, orderB.id]),
            accountB.from("simulated_payments").select("id, status").in("id", [orderA.id, orderAPlus.id, orderB.id])
        ]);
        assert.ok(!visibleToA.error && !visibleToB.error);
        assert.deepEqual(new Set(visibleToA.data.map((order) => order.id)), new Set([orderA.id, orderAPlus.id]));
        assert.deepEqual(new Set(visibleToB.data.map((order) => order.id)), new Set([orderB.id]));

        const [signOutA, signOutB] = await Promise.all([accountA.auth.signOut(), accountB.auth.signOut()]);
        assert.ok(!signOutA.error && !signOutB.error, "O logout deve encerrar as sessões das duas contas.");
        const [sessionA, sessionB] = await Promise.all([accountA.auth.getSession(), accountB.auth.getSession()]);
        assert.equal(sessionA.data.session, null);
        assert.equal(sessionB.data.session, null);
    } finally {
        await new Promise((resolve) => apiServer.close(resolve));
        await Promise.all([accountA.auth.signOut(), accountB.auth.signOut()]);
    }
});
