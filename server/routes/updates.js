const updateFields = "id, title, version, release_date, category, description, created_at";
const categories = new Set([
    "Novidades",
    "Melhorias",
    "Correções de bugs",
    "Balanceamento",
    "Eventos",
    "Outros"
]);
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidDate(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function getValidationError(payload) {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
        return "Envie os dados da atualização em formato de objeto JSON.";
    }
    const title = typeof payload.title === "string" ? payload.title.trim() : "";
    const version = typeof payload.version === "string" ? payload.version.trim() : "";
    const description = typeof payload.description === "string" ? payload.description.trim() : "";
    if (title.length < 1 || title.length > 160) return "O título deve ter entre 1 e 160 caracteres.";
    if (version.length < 1 || version.length > 40) return "A versão deve ter entre 1 e 40 caracteres.";
    if (!isValidDate(payload.release_date)) return "Informe uma data de atualização válida.";
    if (payload.category !== null && payload.category !== undefined
        && payload.category !== "" && !categories.has(payload.category)) {
        return "Selecione uma categoria válida.";
    }
    if (description.length < 1 || description.length > 10000) {
        return "A descrição deve ter entre 1 e 10000 caracteres.";
    }
    return null;
}

function mapDatabaseError(error, operation) {
    if (error.code === "42501" || error.code === "PGRST301") {
        return { status: 403, message: "Somente administradores podem gerenciar atualizações." };
    }
    if (error.code === "PGRST205" || error.code === "42P01") {
        return {
            status: 503,
            message: "A tabela de atualizações ainda não está configurada. Execute database/ddl/supabase_atualizacoes.sql no SQL Editor do Supabase."
        };
    }
    if (["23514", "23502", "22001", "22007"].includes(error.code)) {
        return { status: 400, message: "Os dados da atualização não atendem aos requisitos." };
    }
    console.error(`Não foi possível ${operation} a atualização.`, error);
    return { status: 503, message: "Não foi possível processar a atualização." };
}

function toDatabasePayload(payload) {
    return {
        title: payload.title.trim(),
        version: payload.version.trim(),
        release_date: payload.release_date,
        category: payload.category || null,
        description: payload.description.trim()
    };
}

export function createUpdatesHandler({ authenticate, publicClient, readJson, sendJson }) {
    return async function handleUpdates(request, response, origin) {
        const path = new URL(request.url || "/", "http://localhost").pathname;
        const basePath = "/api/updates";
        const isBasePath = path === basePath;
        const updateId = isBasePath ? null : path.startsWith(`${basePath}/`) ? path.slice(basePath.length + 1) : null;
        if (!isBasePath && updateId === null) return false;

        const method = request.method;
        if (isBasePath && method === "GET") {
            let client = publicClient;
            let isAdmin = false;
            if (request.headers.authorization) {
                const auth = await authenticate(request);
                if (auth.error) {
                    sendJson(response, auth.status, { error: auth.error, code: auth.code }, origin);
                    return true;
                }
                client = auth.client;
                const { data, error } = await client.rpc("is_feedback_admin");
                if (error) {
                    const mapped = mapDatabaseError(error, "verificar permissões administrativas");
                    sendJson(response, mapped.status, { error: mapped.message }, origin);
                    return true;
                }
                isAdmin = data === true;
            }

            const { data, error } = await client
                .from("game_updates")
                .select(updateFields)
                .order("release_date", { ascending: false })
                .order("created_at", { ascending: false });
            if (error) {
                const mapped = mapDatabaseError(error, "carregar");
                sendJson(response, mapped.status, { error: mapped.message }, origin);
                return true;
            }
            sendJson(response, 200, { updates: data, is_admin: isAdmin }, origin);
            return true;
        }

        if (isBasePath && method === "POST") {
            const auth = await authenticate(request);
            if (auth.error) {
                sendJson(response, auth.status, { error: auth.error, code: auth.code }, origin);
                return true;
            }
            const payload = await readJson(request, 48 * 1024);
            const validationError = getValidationError(payload);
            if (validationError) {
                sendJson(response, 400, { error: validationError }, origin);
                return true;
            }
            const { data, error } = await auth.client
                .from("game_updates")
                .insert(toDatabasePayload(payload))
                .select(updateFields)
                .single();
            if (error) {
                const mapped = mapDatabaseError(error, "criar");
                sendJson(response, mapped.status, { error: mapped.message }, origin);
                return true;
            }
            sendJson(response, 201, data, origin);
            return true;
        }

        if (updateId !== null && ["PUT", "DELETE"].includes(method)) {
            if (!uuidPattern.test(updateId)) {
                sendJson(response, 400, { error: "Identificador de atualização inválido." }, origin);
                return true;
            }
            const auth = await authenticate(request);
            if (auth.error) {
                sendJson(response, auth.status, { error: auth.error, code: auth.code }, origin);
                return true;
            }

            if (method === "PUT") {
                const payload = await readJson(request, 48 * 1024);
                const validationError = getValidationError(payload);
                if (validationError) {
                    sendJson(response, 400, { error: validationError }, origin);
                    return true;
                }
                const { data, error } = await auth.client
                    .from("game_updates")
                    .update(toDatabasePayload(payload))
                    .eq("id", updateId)
                    .select(updateFields)
                    .maybeSingle();
                if (error) {
                    const mapped = mapDatabaseError(error, "atualizar");
                    sendJson(response, mapped.status, { error: mapped.message }, origin);
                    return true;
                }
                if (!data) {
                    sendJson(response, 404, { error: "Atualização não encontrada." }, origin);
                    return true;
                }
                sendJson(response, 200, data, origin);
                return true;
            }

            const { data, error } = await auth.client
                .from("game_updates")
                .delete()
                .eq("id", updateId)
                .select("id")
                .maybeSingle();
            if (error) {
                const mapped = mapDatabaseError(error, "excluir");
                sendJson(response, mapped.status, { error: mapped.message }, origin);
                return true;
            }
            if (!data) {
                sendJson(response, 404, { error: "Atualização não encontrada." }, origin);
                return true;
            }
            sendJson(response, 200, { deleted: true }, origin);
            return true;
        }

        sendJson(response, 405, { error: "Método não permitido." }, origin);
        return true;
    };
}
