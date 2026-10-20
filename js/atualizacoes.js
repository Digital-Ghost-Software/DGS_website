import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.116.0/+esm";
import { loadSupabaseConfig } from "./supabase-config.js";

// Referências dos elementos que recebem notas, mensagens e ações administrativas.
const management = document.querySelector(".updates-management");
const adminMessage = document.querySelector("#updatesAdminMessage");
const newUpdateButton = document.querySelector("#newUpdateButton");
const updatePanel = document.querySelector(".updates-compose");
const updateForm = document.querySelector("#updateForm");
const updateFormMessage = document.querySelector("#updateFormMessage");
const updatesList = document.querySelector("#updatesList");
const updatesListMessage = document.querySelector("#updatesListMessage");
const cancelUpdateButton = document.querySelector("#cancelUpdateButton");

// Valores aceitos também são impostos por uma restrição na tabela SQL.
const categories = new Set([
    "Novidades",
    "Melhorias",
    "Correções de bugs",
    "Balanceamento",
    "Eventos",
    "Outros"
]);

function showMessage(element, message, state = "info") {
    element.textContent = message;
    element.dataset.state = state;
}

async function requestUpdates(path, { method = "GET", token, payload } = {}) {
    const headers = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    if (payload) headers["Content-Type"] = "application/json";
    let response;
    try {
        response = await fetch(path, {
            method,
            headers,
            ...(payload ? { body: JSON.stringify(payload) } : {})
        });
    } catch (error) {
        console.error(`Falha de rede ao chamar ${method} ${path}.`, error);
        throw new Error("Não foi possível conectar à API de atualizações. Confira se a versão mais recente do servidor foi publicada e tente novamente.", { cause: error });
    }
    let result;
    try {
        result = await response.json();
    } catch (error) {
        throw new Error(`O serviço de atualizações retornou uma resposta inválida (${response.status}).`, { cause: error });
    }
    if (!response.ok) {
        const error = new Error(result.error || "Não foi possível processar a solicitação.");
        error.status = response.status;
        throw error;
    }
    return result;
}

function getApiErrorMessage(error, operation) {
    if (error.status === 401) return "Sua sessão expirou. Entre novamente para gerenciar atualizações.";
    if (error.status === 403) return "Você não tem autorização para realizar esta operação. Somente administradores podem gerenciar atualizações.";
    if (error.status === 503 && error.message.includes("tabela de atualizações")) return error.message;
    if (error.message) return error.message;
    return operation === "read"
        ? "Não foi possível carregar as atualizações. Verifique a conexão e tente novamente."
        : "Não foi possível salvar a alteração. Verifique a conexão e tente novamente.";
}

// Trata a coluna DATE como data civil local, sem deslocamento de fuso.
function formatDate(value) {
    return new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" })
        .format(new Date(`${value}T12:00:00`));
}

// Cria o card com textContent para não interpretar valores do banco como HTML.
function renderUpdate(update, isAdmin) {
    const article = document.createElement("article");
    article.className = "update-card";
    article.dataset.updateId = update.id;
    article.dataset.releaseDate = update.release_date;
    article.dataset.createdAt = update.created_at;

    const header = document.createElement("header");
    const title = document.createElement("h3");
    title.textContent = update.title;
    const date = document.createElement("time");
    date.dateTime = update.release_date;
    date.textContent = formatDate(update.release_date);
    header.append(title, date);

    const metadata = document.createElement("div");
    metadata.className = "update-card-meta";
    const version = document.createElement("span");
    version.className = "update-version";
    version.textContent = `Versão ${update.version}`;
    metadata.append(version);
    if (update.category) {
        const category = document.createElement("span");
        category.className = "update-category";
        category.textContent = update.category;
        metadata.append(category);
    }

    const description = document.createElement("p");
    description.className = "update-description";
    description.textContent = update.description;
    article.append(header, metadata, description);

    if (isAdmin) {
        const actions = document.createElement("div");
        actions.className = "update-actions";
        const deleteButton = document.createElement("button");
        deleteButton.className = "update-delete-button";
        deleteButton.type = "button";
        deleteButton.dataset.action = "delete";
        deleteButton.textContent = "Excluir atualização";
        actions.append(deleteButton);
        article.append(actions);
    }

    return article;
}

// Mantém a ordem por data de lançamento e, em empate, por criação do registro.
function insertUpdateInOrder(update, isAdmin) {
    const card = renderUpdate(update, isAdmin);
    const insertionPoint = [...updatesList.querySelectorAll(".update-card")].find((existingCard) => (
        existingCard.dataset.releaseDate < update.release_date
        || (
            existingCard.dataset.releaseDate === update.release_date
            && existingCard.dataset.createdAt < update.created_at
        )
    ));
    updatesList.insertBefore(card, insertionPoint || null);
}

// Recupera a listagem pela API do servidor.
async function loadUpdates(token) {
    updatesList.setAttribute("aria-busy", "true");
    showMessage(updatesListMessage, "Carregando atualizações...");
    try {
        let response;
        try {
            response = await requestUpdates("/api/updates", { token });
        } catch (error) {
            if (error.status !== 401 || !token) throw error;
            console.error("A sessão não pôde ser verificada; carregando atualizações sem acesso administrativo.", error);
            adminMessage.hidden = false;
            showMessage(adminMessage, "Sua sessão expirou. Entre novamente para gerenciar atualizações.", "error");
            response = await requestUpdates("/api/updates");
        }
        const { updates, is_admin: isAdmin } = response;
        updatesList.replaceChildren(...updates.map((update) => renderUpdate(update, isAdmin)));
        management.hidden = !isAdmin;
        showMessage(updatesListMessage, updates.length ? "" : "Ainda não há atualizações publicadas.");
    } catch (error) {
        console.error("Não foi possível carregar as atualizações.", error);
        showMessage(updatesListMessage, getApiErrorMessage(error, "read"), "error");
    } finally {
        updatesList.setAttribute("aria-busy", "false");
    }
}

// Confere que a data existe no calendário e segue o formato esperado pelo campo date.
function isValidCalendarDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

// Obtém a sessão do navegador e deixa a API verificar as permissões administrativas.
async function initializeUpdates() {
    const { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } = await loadSupabaseConfig();
    const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
    let token = null;
    const { data: authData, error: authError } = await supabase.auth.getSession();
    if (authError) {
        console.error("Não foi possível carregar a sessão para verificar permissões.", authError);
        adminMessage.hidden = false;
        showMessage(adminMessage, "Não foi possível verificar sua sessão; as ações administrativas ficam indisponíveis.", "error");
    } else {
        token = authData.session?.access_token || null;
    }

    await loadUpdates(token);

    newUpdateButton.addEventListener("click", () => {
        updatePanel.hidden = false;
        updateForm.elements.title.focus();
    });

    cancelUpdateButton.addEventListener("click", () => {
        updateForm.reset();
        updatePanel.hidden = true;
        showMessage(updateFormMessage, "");
    });

    updateForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const formData = new FormData(updateForm);
        const title = String(formData.get("title") || "").trim();
        const version = String(formData.get("version") || "").trim();
        const releaseDate = String(formData.get("release_date") || "");
        const category = String(formData.get("category") || "");
        const description = String(formData.get("description") || "").trim();

        if (!title || !version || !description || !isValidCalendarDate(releaseDate)) {
            showMessage(updateFormMessage, "Informe título, versão, descrição e uma data válida.", "error");
            return;
        }
        if (category && !categories.has(category)) {
            showMessage(updateFormMessage, "Selecione uma categoria válida.", "error");
            return;
        }

        const submitButton = updateForm.querySelector('[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = "Salvando...";
        showMessage(updateFormMessage, "Salvando atualização...");
        try {
            const createdUpdate = await requestUpdates("/api/updates", {
                method: "POST",
                token,
                payload: {
                    title,
                    version,
                    release_date: releaseDate,
                    category: category || null,
                    description
                }
            });

            const alreadyListed = [...updatesList.querySelectorAll(".update-card")]
                .some((card) => card.dataset.updateId === createdUpdate.id);
            if (!alreadyListed) insertUpdateInOrder(createdUpdate, isAdmin);
            updateForm.reset();
            updatePanel.hidden = true;
            showMessage(updatesListMessage, "Atualização publicada com sucesso.", "success");
        } catch (error) {
            console.error("Falha de conexão ao salvar a atualização.", error);
            showMessage(updateFormMessage, getApiErrorMessage(error, "write"), "error");
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = "Salvar atualização";
        }
    });

    updatesList.addEventListener("click", async (event) => {
        const button = event.target.closest('button[data-action="delete"]');
        if (!button || !isAdmin) return;
        const card = button.closest(".update-card");
        if (!card || !window.confirm("Tem certeza de que deseja excluir esta atualização?")) return;

        button.disabled = true;
        button.textContent = "Excluindo...";
        try {
            await requestUpdates(`/api/updates/${encodeURIComponent(card.dataset.updateId)}`, {
                method: "DELETE",
                token
            });

            card.remove();
            showMessage(
                updatesListMessage,
                updatesList.querySelector(".update-card")
                    ? "Atualização excluída."
                    : "Atualização excluída. Ainda não há outras notas publicadas.",
                "success"
            );
        } catch (error) {
            console.error("Falha de conexão ao excluir a atualização.", error);
            showMessage(updatesListMessage, getApiErrorMessage(error, "write"), "error");
        } finally {
            button.disabled = false;
            button.textContent = "Excluir atualização";
        }
    });
}

// Converte falhas de configuração/inicialização em estado visível, sem simular sucesso.
initializeUpdates().catch((error) => {
    console.error("Não foi possível inicializar a página de atualizações.", error);
    updatesList.setAttribute("aria-busy", "false");
    showMessage(updatesListMessage, "Não foi possível conectar ao serviço. Verifique a configuração e tente novamente.", "error");
});
