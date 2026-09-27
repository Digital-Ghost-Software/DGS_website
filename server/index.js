import { createClient } from "@supabase/supabase-js";
import { paymentMethods } from "../js/purchase-rules.js";

try {
    process.loadEnvFile();
} catch (error) {
    if (error.code !== "ENOENT") throw error;
}

const projectUrl = process.env.SUPABASE_URL;
const publicKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
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
const adminClient = serviceRoleKey ? createClient(projectUrl, serviceRoleKey, {
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

function createUserClient(token) {
    return createClient(projectUrl, publicKey, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: { headers: { Authorization: `Bearer ${token}` } }
    });
}

async function authenticate(request) {
    const token = request.headers.authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token) return { error: "Autenticação necessária.", status: 401 };
    const { data: { user }, error } = await authClient.auth.getUser(token);
    if (error || !user) return { error: "Sessão inválida. Entre novamente.", status: 401 };
    return { user, client: createUserClient(token) };
}

export async function handler(request, response) {
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
        if (path === "/api/profile" && request.method === "GET") {
            const auth = await authenticate(request);
            if (auth.error) return sendJson(response, auth.status, { error: auth.error }, origin);
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
            const { data, error } = await auth.client
                .from("simulated_payments")
                .insert({ edition: payload.edition, payment_method: payload.payment_method })
                .select("id, edition, amount_brl, payment_method, status, created_at")
                .single();
            if (error) return sendJson(response, 503, { error: "Não foi possível registrar o pedido simulado." }, origin);
            return sendJson(response, 201, data, origin);
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
            if (!adminClient) {
                return sendJson(response, 503, {
                    error: "A exclusão da conta não está configurada no servidor.",
                    code: "ACCOUNT_DELETION_UNAVAILABLE"
                }, origin);
            }
            const { error } = await adminClient.auth.admin.deleteUser(auth.user.id);
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
}
