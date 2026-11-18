const pagePaths = new Set([
    "/",
    "/index.html",
    "/paginas/tales.html",
    "/paginas/outros_jogos.html",
    "/paginas/download.html",
    "/paginas/atualizacoes.html",
    "/paginas/feedback.html",
    "/paginas/doacoes.html",
    "/paginas/perfil.html",
    "/paginas/cadastro.html",
    "/paginas/login.html",
    "/paginas/recuperar-senha.html",
    "/paginas/dashboard.html"
]);
const usersPerPage = 1000;

async function loadUsers(adminClient) {
    const users = [];
    for (let page = 1; ; page += 1) {
        const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage: usersPerPage });
        if (error) throw error;

        const authUsers = data.users || [];
        const userIds = authUsers.map(({ id }) => id);
        const { data: profiles, error: profilesError } = userIds.length
            ? await adminClient
                .from("profiles")
                .select("user_id, user_name, user_level")
                .in("user_id", userIds)
            : { data: [], error: null };
        if (profilesError) throw profilesError;

        const profilesByUserId = new Map((profiles || []).map((profile) => [profile.user_id, profile]));
        users.push(...authUsers.map((user) => {
            const profile = profilesByUserId.get(user.id);
            return {
                id: user.id,
                email: typeof user.email === "string" ? user.email : null,
                user_name: profile?.user_name
                    || user.user_metadata?.user_name
                    || user.email?.split("@")[0]
                    || "Usuário",
                user_level: profile?.user_level || null,
                created_at: user.created_at || null,
                last_sign_in_at: user.last_sign_in_at || null,
                email_confirmed_at: user.email_confirmed_at || null
            };
        }));

        if (authUsers.length < usersPerPage) break;
    }
    return users;
}

export function createDashboardHandler({ authenticate, adminClient, readJson, sendJson }) {
    return async function handleDashboard(request, response, origin) {
        const path = new URL(request.url || "/", "http://localhost").pathname;

        if (path === "/api/analytics/visit" && request.method === "POST") {
            const payload = await readJson(request);
            if (!payload || typeof payload.page_path !== "string" || !pagePaths.has(payload.page_path)) {
                sendJson(response, 400, { error: "Página inválida para registrar visita." }, origin);
                return true;
            }
            if (!adminClient) {
                sendJson(response, 503, { error: "O registro de visitas não está configurado no servidor." }, origin);
                return true;
            }
            const pagePath = payload.page_path === "/index.html" ? "/" : payload.page_path;
            const { error } = await adminClient.rpc("record_page_visit", { p_page_path: pagePath });
            if (error) {
                console.error("Não foi possível registrar a visita da página.", error);
                sendJson(response, 503, { error: "Não foi possível registrar a visita." }, origin);
                return true;
            }
            sendJson(response, 200, { recorded: true }, origin);
            return true;
        }

        if ((path === "/api/analytics/visit" && request.method !== "POST")
            || (path === "/api/dashboard" && request.method !== "GET")) {
            sendJson(response, 405, { error: "Método não permitido." }, origin);
            return true;
        }
        if (path !== "/api/dashboard") return false;

        const auth = await authenticate(request);
        if (auth.error) {
            sendJson(response, auth.status, { error: auth.error, code: auth.code }, origin);
            return true;
        }
        const { data: isAdmin, error: adminCheckError } = await auth.client.rpc("is_feedback_admin");
        if (adminCheckError) {
            console.error("Não foi possível verificar o acesso administrativo ao dashboard.", adminCheckError);
            sendJson(response, 503, { error: "Não foi possível verificar as permissões administrativas." }, origin);
            return true;
        }
        if (isAdmin !== true) {
            sendJson(response, 403, { error: "Somente administradores podem acessar o dashboard." }, origin);
            return true;
        }
        if (!adminClient) {
            sendJson(response, 503, { error: "O dashboard não está configurado no servidor." }, origin);
            return true;
        }

        const [
            { data: visits, error: visitsError },
            { count: downloads, error: downloadsError },
            users
        ] = await Promise.all([
            adminClient.from("page_visits").select("page_path, visit_count").order("page_path"),
            adminClient.from("game_downloads").select("id", { count: "exact", head: true }),
            loadUsers(adminClient)
        ]);
        if (visitsError || downloadsError) {
            const error = visitsError || downloadsError;
            console.error("Não foi possível carregar as métricas do dashboard.", error);
            sendJson(response, 503, { error: "Não foi possível carregar as métricas do dashboard." }, origin);
            return true;
        }

        sendJson(response, 200, { visits, downloads: downloads || 0, users }, origin);
        return true;
    };
}
