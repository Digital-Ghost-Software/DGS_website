import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { paymentMethods, purchasePlans } from "../js/purchase-rules.js";

try {
    process.loadEnvFile();
} catch (error) {
    if (error.code !== "ENOENT") throw error;
}

const projectUrl = process.env.SUPABASE_URL;
const publicKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
const supabaseServerKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || "";
const stripeClient = /^sk_test_/.test(stripeSecretKey) ? new Stripe(stripeSecretKey) : null;
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";
const publicAppUrl = process.env.PUBLIC_APP_URL || "";
const releaseVersion = process.env.GAME_RELEASE_VERSION || "1.0";
const allowedOrigins = new Set(
    (process.env.ALLOWED_ORIGINS || "")
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean)
);

if (!projectUrl || !publicKey) {
    throw new Error("Configure SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY (or SUPABASE_ANON_KEY) in the server environment.");
}

const authClient = createClient(projectUrl, publicKey, {
    auth: { persistSession: false, autoRefreshToken: false }
});
const adminClient = supabaseServerKey ? createClient(projectUrl, supabaseServerKey, {
    auth: { persistSession: false, autoRefreshToken: false }
}) : null;

function sendJson(response, status, body, corsOrigin) {
    const headers = {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        "Vary": "Origin"
    };
    if (corsOrigin) {
        headers["Access-Control-Allow-Origin"] = corsOrigin;
        headers["Access-Control-Allow-Methods"] = "GET, PATCH, POST, OPTIONS";
        headers["Access-Control-Allow-Headers"] = "Authorization, Content-Type";
    }
    response.writeHead(status, headers);
    response.end(JSON.stringify(body));
}

async function readJson(request) {
    let body = "";
    for await (const chunk of request) {
        body += chunk.toString("utf8");
        if (body.length > 4096) throw Object.assign(new Error("A solicitação excede o tamanho permitido."), { status: 413 });
    }
    if (!body) return {};
    try {
        return JSON.parse(body);
    } catch {
        throw Object.assign(new Error("O conteúdo enviado não está em formato JSON válido."), { status: 400 });
    }
}

async function readRawBody(request, limit = 1024 * 1024) {
    const chunks = [];
    let size = 0;
    for await (const chunk of request) {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        size += buffer.length;
        if (size > limit) throw Object.assign(new Error("A solicitação excede o tamanho permitido."), { status: 413 });
        chunks.push(buffer);
    }
    return Buffer.concat(chunks);
}

function getCheckoutBaseUrl(value) {
    try {
        const parsed = new URL(value);
        const production = process.env.VERCEL_ENV === "production";
        if (!['https:', 'http:'].includes(parsed.protocol) || parsed.username || parsed.password || parsed.search || parsed.hash) return null;
        if (production && parsed.protocol !== "https:") return null;
        return parsed.origin;
    } catch {
        return null;
    }
}

function createUserClient(token) {
    return createClient(projectUrl, publicKey, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: { headers: { Authorization: `Bearer ${token}` } }
    });
}

function getRejectedTokenCode(token) {
    try {
        const parts = token.split(".");
        if (parts.length !== 3) return "token_format_invalid";
        const claims = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
        const expectedIssuer = `${new URL(projectUrl).origin}/auth/v1`;
        if (typeof claims.iss !== "string" || !Number.isFinite(claims.exp)) return "token_claims_incomplete";
        if (typeof claims.iss === "string" && claims.iss !== expectedIssuer) return "session_project_mismatch";
        if (Number.isFinite(claims.exp) && claims.exp * 1000 <= Date.now()) return "session_expired";
        return "token_claims_match_but_rejected";
    } catch {
        return "token_claims_invalid";
    }
}

async function authenticate(request) {
    const token = request.headers.authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token) return { error: "Autenticação necessária.", status: 401, code: "missing_bearer_token", upstreamStatus: null };
    const { data: { user }, error } = await authClient.auth.getUser(token);
    if (error || !user) {
        const tokenDiagnostic = getRejectedTokenCode(token);
        const code = error?.status === 401
            ? tokenDiagnostic
            : typeof error?.code === "string" && /^[a-z0-9_-]{1,64}$/i.test(error.code)
                ? error.code
                : "auth_provider_error";
        return {
            error: "Sessão inválida. Entre novamente.",
            status: 401,
            code,
            tokenDiagnostic,
            upstreamStatus: Number.isInteger(error?.status) ? error.status : null
        };
    }
    return { user, client: createUserClient(token) };
}

export function createHandler(overrides = {}) {
    const stripe = overrides.stripeClient ?? stripeClient;
    const admin = overrides.adminClient ?? adminClient;
    const webhookSecret = overrides.webhookSecret ?? stripeWebhookSecret;
    const checkoutBaseUrl = getCheckoutBaseUrl(overrides.publicAppUrl ?? publicAppUrl);

    return async function handler(request, response) {
    const origin = request.headers.origin;
    const forwardedHost = request.headers["x-forwarded-host"] || request.headers.host;
    const forwardedProto = request.headers["x-forwarded-proto"]?.split(",")[0]
        || (request.socket.encrypted ? "https" : "http");
    const isSameOrigin = origin && forwardedHost && origin === `${forwardedProto}://${forwardedHost}`;
    if (origin && !allowedOrigins.has(origin) && !isSameOrigin) {
        sendJson(response, 403, { error: "Origem não autorizada." });
        return;
    }

    if (request.method === "OPTIONS") {
        response.writeHead(204, {
            "Vary": "Origin",
            ...(origin ? {
                "Access-Control-Allow-Origin": origin,
                "Access-Control-Allow-Methods": "GET, PATCH, POST, OPTIONS",
                "Access-Control-Allow-Headers": "Authorization, Content-Type",
                "Access-Control-Max-Age": "600"
            } : {})
        });
        response.end();
        return;
    }

    const requestUrl = new URL(request.url || "/", "http://localhost");
    const path = requestUrl.pathname;
    if (request.method === "GET" && path === "/api/config") {
        sendJson(response, 200, {
            supabaseUrl: projectUrl,
            supabasePublishableKey: publicKey
        }, origin);
        return;
    }

    if (request.method === "GET" && path === "/api/health") {
        sendJson(response, 200, { status: "ok" }, origin);
        return;
    }

    try {
        if (path === "/api/stripe/webhook" && request.method === "POST") {
            if (!stripe || !webhookSecret || !admin) {
                return sendJson(response, 503, { error: "A confirmação de pagamentos não está configurada no servidor." }, origin);
            }
            const signature = request.headers["stripe-signature"];
            if (typeof signature !== "string") {
                return sendJson(response, 400, { error: "Assinatura do evento Stripe ausente." }, origin);
            }

            let event;
            try {
                const rawBody = await readRawBody(request);
                event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
            } catch {
                return sendJson(response, 400, { error: "Não foi possível validar o evento da Stripe." }, origin);
            }

            const session = event.data?.object;
            let paymentStatus = null;
            if (event.type === "checkout.session.completed" && session?.payment_status === "paid") paymentStatus = "paid";
            if (event.type === "checkout.session.async_payment_succeeded") paymentStatus = "paid";
            if (event.type === "checkout.session.async_payment_failed") paymentStatus = "failed";
            if (event.type === "checkout.session.expired") paymentStatus = "expired";
            if (!paymentStatus) return sendJson(response, 200, { received: true }, origin);

            const orderId = session?.client_reference_id || session?.metadata?.order_id;
            if (typeof orderId !== "string" || !/^[0-9a-f-]{36}$/i.test(orderId)) {
                return sendJson(response, 400, { error: "O evento não contém um pedido válido." }, origin);
            }
            const { error } = await admin
                .from("simulated_payments")
                .update({ status: paymentStatus })
                .eq("id", orderId)
                .eq("status", "pending");
            if (error) {
                console.error("Falha ao atualizar o status do pedido após o evento Stripe.", error);
                return sendJson(response, 500, { error: "Não foi possível atualizar o pedido." }, origin);
            }
            return sendJson(response, 200, { received: true }, origin);
        }

        if (path === "/api/profile" && request.method === "GET") {
            const auth = await authenticate(request);
            if (auth.error) return sendJson(response, auth.status, {
                error: auth.error,
                code: auth.code,
                authStatus: auth.upstreamStatus,
                tokenDiagnostic: auth.tokenDiagnostic
            }, origin);
            const { data: profile, error } = await auth.client
                .from("profiles")
                .select("user_name, user_foto, user_level")
                .eq("user_id", auth.user.id)
                .single();
            if (error || !profile) return sendJson(response, 503, { error: "Não foi possível carregar seu perfil." }, origin);
            return sendJson(response, 200, {
                id: auth.user.id,
                email: auth.user.email,
                user_name: profile.user_name,
                user_foto: profile.user_foto,
                user_level: profile.user_level
            }, origin);
        }

        if (path === "/api/profile" && request.method === "PATCH") {
            const auth = await authenticate(request);
            if (auth.error) return sendJson(response, auth.status, { error: auth.error }, origin);
            const payload = await readJson(request);
            const userName = typeof payload.user_name === "string" ? payload.user_name.trim() : "";
            if (userName.length < 2 || userName.length > 80) {
                return sendJson(response, 400, { error: "O nome deve ter entre 2 e 80 caracteres." }, origin);
            }
            const { data: profile, error } = await auth.client
                .from("profiles")
                .update({ user_name: userName })
                .eq("user_id", auth.user.id)
                .select("user_name, user_foto, user_level")
                .single();
            if (error || !profile) return sendJson(response, 503, { error: "Não foi possível atualizar seu perfil." }, origin);
            return sendJson(response, 200, profile, origin);
        }

        if (path === "/api/payments" && ["GET", "POST"].includes(request.method)) {
            const auth = await authenticate(request);
            if (auth.error) return sendJson(response, auth.status, { error: auth.error }, origin);

            if (request.method === "GET") {
                const { data: payments, error } = await auth.client
                    .from("simulated_payments")
                    .select("id, edition, amount_brl, payment_method, status, created_at")
                    .order("created_at", { ascending: false });
                if (error) return sendJson(response, 503, { error: "Não foi possível carregar os pedidos." }, origin);
                const ids = payments.map((payment) => payment.id);
                let downloads = [];
                if (ids.length) {
                    const result = await auth.client
                        .from("game_downloads")
                        .select("payment_id, release_version, requested_at")
                        .in("payment_id", ids)
                        .order("requested_at", { ascending: false });
                    if (result.error) return sendJson(response, 503, { error: "Não foi possível carregar o histórico de downloads." }, origin);
                    downloads = result.data;
                }
                return sendJson(response, 200, { payments, downloads }, origin);
            }

            const payload = await readJson(request);
            if (!["standard", "plus"].includes(payload.edition)) {
                return sendJson(response, 400, { error: "Edição inválida. Escolha Standard ou Plus." }, origin);
            }
            if (!Object.hasOwn(paymentMethods, payload.payment_method)) {
                return sendJson(response, 400, { error: "Escolha uma forma de pagamento válida." }, origin);
            }
            if (!stripe || !admin || !webhookSecret || !checkoutBaseUrl) {
                return sendJson(response, 503, { error: "O checkout de teste não está configurado no servidor." }, origin);
            }
            const plan = purchasePlans[payload.edition];
            const { data: order, error } = await admin
                .from("simulated_payments")
                .insert({
                    user_id: auth.user.id,
                    edition: payload.edition,
                    payment_method: payload.payment_method,
                    status: "pending"
                })
                .select("id, edition, amount_brl, payment_method, status, created_at")
                .single();
            if (error || !order) return sendJson(response, 503, { error: "Não foi possível preparar o pedido para pagamento." }, origin);

            let session;
            try {
                session = await stripe.checkout.sessions.create({
                    mode: "payment",
                    payment_method_types: [["credito", "debito"].includes(payload.payment_method) ? "card" : payload.payment_method],
                    line_items: [{
                        price_data: {
                            currency: "brl",
                            product_data: { name: `Yokai Tales — edição ${plan.label}` },
                            unit_amount: Math.round(plan.value * 100)
                        },
                        quantity: 1
                    }],
                    client_reference_id: order.id,
                    metadata: { order_id: order.id },
                    success_url: `${checkoutBaseUrl}/paginas/download.html?checkout=success&order_id=${encodeURIComponent(order.id)}&session_id={CHECKOUT_SESSION_ID}`,
                    cancel_url: `${checkoutBaseUrl}/paginas/download.html?checkout=cancelled&order_id=${encodeURIComponent(order.id)}`
                });
            } catch (stripeError) {
                console.error("Falha ao criar sessão de checkout de teste.", stripeError);
                await admin.from("simulated_payments").update({ status: "failed" }).eq("id", order.id).eq("status", "pending");
                return sendJson(response, 502, { error: "Não foi possível iniciar o checkout de teste. Tente novamente." }, origin);
            }
            let checkoutUrl;
            try {
                checkoutUrl = new URL(session?.url);
            } catch {
                checkoutUrl = null;
            }
            if (checkoutUrl?.protocol !== "https:" || checkoutUrl?.hostname !== "checkout.stripe.com") {
                await admin.from("simulated_payments").update({ status: "failed" }).eq("id", order.id).eq("status", "pending");
                return sendJson(response, 502, { error: "A Stripe não retornou um checkout válido." }, origin);
            }
            return sendJson(response, 201, { ...order, checkout_url: checkoutUrl.href }, origin);
        }

        if (path === "/api/downloads" && request.method === "POST") {
            const auth = await authenticate(request);
            if (auth.error) return sendJson(response, auth.status, { error: auth.error }, origin);
            const payload = await readJson(request);
            if (typeof payload.payment_id !== "string" || !/^[0-9a-f-]{36}$/i.test(payload.payment_id)) {
                return sendJson(response, 400, { error: "Pedido inválido para solicitar o download." }, origin);
            }
            const { data, error } = await auth.client
                .from("game_downloads")
                .insert({ payment_id: payload.payment_id, release_version: releaseVersion })
                .select("payment_id, release_version, requested_at")
                .single();
            if (error) return sendJson(response, 403, { error: "O download não está disponível para este pedido." }, origin);
            return sendJson(response, 201, data, origin);
        }

        if (path === "/api/account/delete" && request.method === "POST") {
            const auth = await authenticate(request);
            if (auth.error) return sendJson(response, auth.status, { error: auth.error }, origin);
            if (!admin) {
                return sendJson(response, 503, {
                    error: "A exclusão da conta não está configurada no servidor.",
                    code: "ACCOUNT_DELETION_UNAVAILABLE"
                }, origin);
            }
            const { error } = await admin.auth.admin.deleteUser(auth.user.id);
            if (error) {
                console.error("Account deletion failed", error);
                return sendJson(response, 500, { error: "Não foi possível excluir a conta." }, origin);
            }
            return sendJson(response, 200, { deleted: true }, origin);
        }

        sendJson(response, 404, { error: "Rota não encontrada." }, origin);
    } catch (error) {
        const status = Number.isInteger(error.status) ? error.status : 500;
        if (status === 500) console.error("API request failed", error);
        sendJson(response, status, {
            error: status === 500 ? "Não foi possível processar a solicitação." : error.message
        }, origin);
    }
    };
}

export const handler = createHandler();
