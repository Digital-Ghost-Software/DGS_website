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
const tableName = "game_updates";

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

// Traduz erros conhecidos do banco em mensagens acionáveis, sem esconder diagnósticos do console.
function getDatabaseErrorMessage(error, operation) {
    if (error.code === "PGRST205" || error.code === "42P01") {
        return "A tabela de atualizações ainda não está configurada. Execute database/ddl/supabase_atualizacoes.sql no SQL Editor do Supabase.";
    }
    if (error.code === "42501" || error.code === "PGRST301") {
        return operation === "read"
            ? "O banco recusou a consulta das atualizações. Confira as permissões de leitura."
            : "Você não tem autorização para realizar esta operação. Somente administradores podem gerenciar atualizações.";
    }
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

// Recupera e renderiza a listagem do Supabase.
async function loadUpdates(supabase, isAdmin) {
    updatesList.setAttribute("aria-busy", "true");
    showMessage(updatesListMessage, "Carregando atualizações...");
    const { data, error } = await supabase
        .from(tableName)
        .select("id, title, version, release_date, category, description, created_at")
        .order("release_date", { ascending: false })
        .order("created_at", { ascending: false });

    updatesList.setAttribute("aria-busy", "false");
    if (error) {
        console.error("Não foi possível carregar as atualizações.", error);
        showMessage(updatesListMessage, getDatabaseErrorMessage(error, "read"), "error");
        return;
    }

    updatesList.replaceChildren(...data.map((update) => renderUpdate(update, isAdmin)));
    showMessage(updatesListMessage, data.length ? "" : "Ainda não há atualizações publicadas.");
}

// Confere que a data existe no calendário e segue o formato esperado pelo campo date.
function isValidCalendarDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

// Obtém a sessão, consulta o verificador administrativo do banco e conecta o formulário.
async function initializeUpdates() {
    const { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } = await loadSupabaseConfig();
    const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
    let user = null;
    let isAdmin = false;

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError && authError.name !== "AuthSessionMissingError") {
        console.error("Não foi possível carregar a sessão para verificar permissões.", authError);
        adminMessage.hidden = false;
        showMessage(adminMessage, "Não foi possível verificar sua sessão; as ações administrativas ficam indisponíveis.");
    } else {
        user = authData.user;
    }

    if (user) {
        // A função confiável consulta public.admin; a interface não deriva privilégios de dados locais.
        const { data, error } = await supabase.rpc("is_feedback_admin");
        if (error) {
            console.error("Não foi possível verificar as permissões administrativas.", error);
            adminMessage.hidden = false;
            showMessage(adminMessage, "Não foi possível verificar as permissões administrativas.", "error");
        } else {
            isAdmin = data === true;
        }
    }

    if (isAdmin) management.hidden = false;
    await loadUpdates(supabase, isAdmin);

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
            // Identificador e data de criação são gerados pelo banco, não pelo navegador.
            const { data: createdUpdate, error } = await supabase
                .from(tableName)
                .insert({
                    title,
                    version,
                    release_date: releaseDate,
                    category: category || null,
                    description
                })
                .select("id, title, version, release_date, category, description, created_at")
                .single();

            if (error) {
                console.error("Não foi possível salvar a atualização.", error);
                showMessage(updateFormMessage, getDatabaseErrorMessage(error, "write"), "error");
                return;
            }

            const alreadyListed = [...updatesList.querySelectorAll(".update-card")]
                .some((card) => card.dataset.updateId === createdUpdate.id);
            if (!alreadyListed) insertUpdateInOrder(createdUpdate, isAdmin);
            updateForm.reset();
            updatePanel.hidden = true;
            showMessage(updatesListMessage, "Atualização publicada com sucesso.", "success");
        } catch (error) {
            console.error("Falha de conexão ao salvar a atualização.", error);
            showMessage(updateFormMessage, getDatabaseErrorMessage(error, "write"), "error");
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
            // O card só é removido depois da confirmação do Supabase.
            const { data, error } = await supabase
                .from(tableName)
                .delete()
                .eq("id", card.dataset.updateId)
                .select("id")
                .maybeSingle();
            if (error) {
                console.error("Não foi possível excluir a atualização.", error);
                showMessage(updatesListMessage, getDatabaseErrorMessage(error, "write"), "error");
                return;
            }
            if (!data) {
                showMessage(updatesListMessage, "A nota não foi excluída: não existe ou sua conta não tem autorização.", "error");
                return;
            }

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
            showMessage(updatesListMessage, getDatabaseErrorMessage(error, "write"), "error");
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
