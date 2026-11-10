import { randomUUID } from "node:crypto";

const gameFields = "id, name, url, image_path, created_at";
const imageBucket = "other-games";
const maxImageBytes = 3 * 1024 * 1024;
const uuidPattern = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const idPattern = new RegExp(`^${uuidPattern}$`, "i");
const imagePathPattern = new RegExp(`^${uuidPattern}/${uuidPattern}\\.(png|jpg|webp)$`, "i");
const imageTypes = new Map([
    ["image/png", { extension: "png", signature: (bytes) => (
        bytes.length >= 8
        && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
        && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
    ) }],
    ["image/jpeg", { extension: "jpg", signature: (bytes) => (
        bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
    ) }],
    ["image/webp", { extension: "webp", signature: (bytes) => (
        bytes.length >= 12
        && bytes.toString("ascii", 0, 4) === "RIFF"
        && bytes.toString("ascii", 8, 12) === "WEBP"
    ) }]
]);

function getValidationError(payload) {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
        return "Envie os dados do jogo em formato de objeto JSON.";
    }
    const name = typeof payload.name === "string" ? payload.name.trim() : "";
    if (name.length < 1 || name.length > 120) return "O nome do jogo deve ter entre 1 e 120 caracteres.";

    let url;
    try {
        url = new URL(payload.url);
    } catch {
        return "Informe um link de acesso válido para o jogo.";
    }
    if (payload.url.length > 2048 || !["http:", "https:"].includes(url.protocol) || url.username || url.password) {
        return "O link do jogo deve usar HTTP ou HTTPS e não pode conter credenciais.";
    }
    if (typeof payload.image_path !== "string" || !imagePathPattern.test(payload.image_path)) {
        return "Envie uma imagem válida para o jogo.";
    }
    return null;
}

function mapDatabaseError(error, operation) {
    if (error.code === "42501" || error.code === "PGRST301") {
        return { status: 403, message: "Somente administradores podem gerenciar os jogos." };
    }
    if (error.code === "PGRST205" || error.code === "42P01") {
        return {
            status: 503,
            message: "A tabela de outros jogos ainda não está configurada. Execute database/ddl/supabase_outros_jogos.sql no SQL Editor do Supabase."
        };
    }
    if (["23514", "23502", "22001"].includes(error.code)) {
        return { status: 400, message: "Os dados do jogo não atendem aos requisitos." };
    }
    console.error(`Não foi possível ${operation} o jogo.`, error);
    return { status: 503, message: "Não foi possível processar o jogo." };
}

function toDatabasePayload(payload) {
    return {
        name: payload.name.trim(),
        url: payload.url.trim(),
        image_path: payload.image_path
    };
}

function withImageUrl(game, publicClient) {
    const { data } = publicClient.storage.from(imageBucket).getPublicUrl(game.image_path);
    return { ...game, image_url: data.publicUrl };
}

function isValidImage(bytes, contentType) {
    return imageTypes.get(contentType)?.signature(bytes) === true;
}

function getStorageError(error, operation) {
    if (error.statusCode === "403" || error.statusCode === "401") {
        return { status: 403, message: "Somente administradores podem gerenciar as imagens dos jogos." };
    }
    if (error.statusCode === "404" || error.error === "Bucket not found") {
        return {
            status: 503,
            message: "O armazenamento de imagens ainda não está configurado. Execute database/ddl/supabase_outros_jogos.sql no Supabase."
        };
    }
    console.error(`Não foi possível ${operation} a imagem do jogo.`, error);
    return { status: 503, message: "Não foi possível processar a imagem do jogo." };
}

async function removeImage(client, imagePath) {
    const { error } = await client.storage.from(imageBucket).remove([imagePath]);
    if (error) throw error;
}

export function createGamesHandler({ authenticate, publicClient, readJson, sendJson }) {
    return async function handleGames(request, response, origin) {
        const requestUrl = new URL(request.url || "/", "http://localhost");
        const path = requestUrl.pathname;
        const basePath = "/api/games";
        const method = request.method;

        if (path === basePath && method === "POST"
            && requestUrl.searchParams.get("action") === "upload-image") {
            const auth = await authenticate(request);
            if (auth.error) {
                sendJson(response, auth.status, { error: auth.error, code: auth.code }, origin);
                return true;
            }

            const payload = await readJson(request, 4.25 * 1024 * 1024);
            if (!payload || typeof payload !== "object" || Array.isArray(payload)
                || typeof payload.content_type !== "string"
                || typeof payload.image_data !== "string"
                || !imageTypes.has(payload.content_type)) {
                sendJson(response, 400, { error: "Envie uma imagem PNG, JPEG ou WebP válida." }, origin);
                return true;
            }

            const encodedImage = payload.image_data;
            if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encodedImage)) {
                sendJson(response, 400, { error: "O arquivo de imagem está corrompido." }, origin);
                return true;
            }
            const image = Buffer.from(encodedImage, "base64");
            if (!image.length || image.length > maxImageBytes || image.toString("base64") !== encodedImage
                || !isValidImage(image, payload.content_type)) {
                sendJson(response, 400, { error: "A imagem deve ser PNG, JPEG ou WebP válida e ter até 3 MiB." }, origin);
                return true;
            }

            const extension = imageTypes.get(payload.content_type).extension;
            const imagePath = `${auth.user.id}/${randomUUID()}.${extension}`;
            const { error } = await auth.client.storage.from(imageBucket).upload(imagePath, image, {
                contentType: payload.content_type,
                upsert: false
            });
            if (error) {
                const mapped = getStorageError(error, "enviar");
                sendJson(response, mapped.status, { error: mapped.message }, origin);
                return true;
            }

            sendJson(response, 201, { image_path: imagePath }, origin);
            return true;
        }

        if (path !== basePath) return false;

        const gameId = requestUrl.searchParams.get("id");
        if (method === "GET") {
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
                .from("other_games")
                .select(gameFields)
                .order("created_at", { ascending: false });
            if (error) {
                const mapped = mapDatabaseError(error, "carregar");
                sendJson(response, mapped.status, { error: mapped.message }, origin);
                return true;
            }
            sendJson(response, 200, {
                games: data.map((game) => withImageUrl(game, publicClient)),
                is_admin: isAdmin
            }, origin);
            return true;
        }

        if (method === "POST" || method === "PUT") {
            if (method === "PUT" && (!gameId || !idPattern.test(gameId))) {
                sendJson(response, 400, { error: "Identificador de jogo inválido." }, origin);
                return true;
            }
            const auth = await authenticate(request);
            if (auth.error) {
                sendJson(response, auth.status, { error: auth.error, code: auth.code }, origin);
                return true;
            }
            const payload = await readJson(request, 16 * 1024);
            const validationError = getValidationError(payload);
            if (validationError) {
                sendJson(response, 400, { error: validationError }, origin);
                return true;
            }

            let previousImagePath = null;
            if (method === "PUT") {
                const { data: current, error } = await auth.client
                    .from("other_games")
                    .select("id, image_path")
                    .eq("id", gameId)
                    .maybeSingle();
                if (error) {
                    const mapped = mapDatabaseError(error, "carregar");
                    sendJson(response, mapped.status, { error: mapped.message }, origin);
                    return true;
                }
                if (!current) {
                    if (payload.image_path.startsWith(`${auth.user.id}/`)) {
                        try {
                            await removeImage(auth.client, payload.image_path);
                        } catch (cleanupError) {
                            console.error("Não foi possível limpar a imagem não utilizada do jogo.", cleanupError);
                        }
                    }
                    sendJson(response, 404, { error: "Jogo não encontrado." }, origin);
                    return true;
                }
                previousImagePath = current.image_path;
            }
            if (payload.image_path !== previousImagePath && !payload.image_path.startsWith(`${auth.user.id}/`)) {
                sendJson(response, 400, { error: "A imagem enviada não pertence à sessão atual." }, origin);
                return true;
            }

            const query = method === "POST"
                ? auth.client.from("other_games").insert(toDatabasePayload(payload))
                : auth.client.from("other_games").update(toDatabasePayload(payload)).eq("id", gameId);
            const { data, error } = await query.select(gameFields).single();
            if (error) {
                if (method === "POST" || payload.image_path !== previousImagePath) {
                    try {
                        await removeImage(auth.client, payload.image_path);
                    } catch (cleanupError) {
                        console.error("Não foi possível limpar a imagem não utilizada do jogo.", cleanupError);
                    }
                }
                const mapped = mapDatabaseError(error, method === "POST" ? "criar" : "atualizar");
                sendJson(response, mapped.status, { error: mapped.message }, origin);
                return true;
            }

            if (previousImagePath && previousImagePath !== data.image_path) {
                try {
                    await removeImage(auth.client, previousImagePath);
                } catch (cleanupError) {
                    const mapped = getStorageError(cleanupError, "excluir a imagem anterior");
                    sendJson(response, mapped.status, {
                        error: `O jogo foi salvo, mas ${mapped.message.toLowerCase()}`
                    }, origin);
                    return true;
                }
            }
            sendJson(response, method === "POST" ? 201 : 200, withImageUrl(data, publicClient), origin);
            return true;
        }

        if (method === "DELETE") {
            if (!gameId || !idPattern.test(gameId)) {
                sendJson(response, 400, { error: "Identificador de jogo inválido." }, origin);
                return true;
            }
            const auth = await authenticate(request);
            if (auth.error) {
                sendJson(response, auth.status, { error: auth.error, code: auth.code }, origin);
                return true;
            }

            const { data, error } = await auth.client
                .from("other_games")
                .delete()
                .eq("id", gameId)
                .select("id, image_path")
                .maybeSingle();
            if (error) {
                const mapped = mapDatabaseError(error, "excluir");
                sendJson(response, mapped.status, { error: mapped.message }, origin);
                return true;
            }
            if (!data) {
                sendJson(response, 404, { error: "Jogo não encontrado." }, origin);
                return true;
            }
            try {
                await removeImage(auth.client, data.image_path);
            } catch (cleanupError) {
                console.error("O jogo foi excluído, mas não foi possível limpar sua imagem.", cleanupError);
                sendJson(response, 503, {
                    error: "O jogo foi excluído, mas não foi possível remover sua imagem armazenada."
                }, origin);
                return true;
            }
            sendJson(response, 200, { deleted: true }, origin);
            return true;
        }

        sendJson(response, 405, { error: "Método não permitido." }, origin);
        return true;
    };
}
