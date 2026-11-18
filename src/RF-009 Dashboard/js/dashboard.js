import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.116.0/+esm";
import { API_BASE_URL, loadSupabaseConfig } from "./supabase-config.js";

const pageNames = {
    "/": "Início",
    "/paginas/tales.html": "Yokai Tales",
    "/paginas/outros_jogos.html": "Outros Jogos",
    "/paginas/download.html": "Download",
    "/paginas/atualizacoes.html": "Atualizações",
    "/paginas/feedback.html": "Feedback",
    "/paginas/doacoes.html": "Doações",
    "/paginas/perfil.html": "Perfil",
    "/paginas/cadastro.html": "Cadastro",
    "/paginas/login.html": "Login",
    "/paginas/recuperar-senha.html": "Recuperar senha",
    "/paginas/dashboard.html": "Dashboard"
};
const $ = (selector) => document.querySelector(selector);
const dashboardMessage = $("#dashboardMessage");

function showError(message) {
    dashboardMessage.textContent = message;
    dashboardMessage.dataset.state = "error";
}

function makeCell(value) {
    const cell = document.createElement("td");
    cell.textContent = value;
    return cell;
}

function formatDate(value) {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("pt-BR");
}

function renderDashboard({ visits, downloads, users }) {
    $("#downloadCount").textContent = Number(downloads).toLocaleString("pt-BR");

    const visitsTable = $("#visitsTable");
    visitsTable.replaceChildren();
    for (const [pagePath, pageName] of Object.entries(pageNames)) {
        const row = document.createElement("tr");
        const visit = visits.find((item) => item.page_path === pagePath);
        row.append(makeCell(pageName), makeCell(Number(visit?.visit_count || 0).toLocaleString("pt-BR")));
        visitsTable.append(row);
    }

    const usersTable = $("#usersTable");
    usersTable.replaceChildren();
    for (const user of users) {
        const row = document.createElement("tr");
        row.append(
            makeCell(user.user_name || "Usuário"),
            makeCell(user.email || "—"),
            makeCell(user.user_level || "—"),
            makeCell(formatDate(user.created_at)),
            makeCell(formatDate(user.last_sign_in_at)),
            makeCell(user.email_confirmed_at ? "Sim" : "Não")
        );
        usersTable.append(row);
    }

    $("#dashboardContent").hidden = false;
    dashboardMessage.hidden = true;
}

async function loadDashboard() {
    try {
        const { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } = await loadSupabaseConfig();
        const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        if (!session?.access_token) {
            showError("Entre com uma conta administradora para acessar o dashboard.");
            return;
        }

        const response = await fetch(`${API_BASE_URL}/api/dashboard`, {
            headers: { Authorization: `Bearer ${session.access_token}` },
            cache: "no-store"
        });
        const result = await response.json();
        if (!response.ok) {
            showError(result.error || "Não foi possível carregar o dashboard.");
            return;
        }
        renderDashboard(result);
    } catch (error) {
        console.error("Falha ao carregar o dashboard.", error);
        showError("Não foi possível carregar os dados. Tente novamente mais tarde.");
    }
}

void loadDashboard();
