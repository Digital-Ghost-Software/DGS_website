import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.116.0/+esm";
import { loadSupabaseConfig } from "./supabase-config.js";

const $ = (selector) => document.querySelector(selector);
const feedbackForm = $("#feedbackForm");
const feedbackContent = $("#feedbackContent");
const feedbackAuthMessage = $("#feedbackAuthMessage");
const feedbackListMessage = $("#feedbackListMessage");
const feedbackList = $("#feedbackList");
const MAX_COMMENT_LENGTH = 2000;

function showMessage(element, message, state = "info") {
    element.textContent = message;
    element.dataset.state = state;
}

function formatDate(date) {
    return new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "medium",
        timeStyle: "short"
    }).format(new Date(date));
}

function renderComment(comment, isAdmin) {
    const article = document.createElement("article");
    article.className = "feedback-comment";
    article.dataset.commentId = comment.id;

    const header = document.createElement("header");
    const author = document.createElement("h3");
    author.textContent = comment.author_name;
    const date = document.createElement("time");
    date.dateTime = comment.created_at;
    date.textContent = formatDate(comment.created_at);
    header.append(author, date);

    const body = document.createElement("p");
    body.className = "feedback-comment-body";
    body.textContent = comment.content;
    article.append(header, body);

    if (isAdmin) {
        const actions = document.createElement("div");
        actions.className = "feedback-comment-actions";

        const editButton = document.createElement("button");
        editButton.type = "button";
        editButton.dataset.action = "edit";
        editButton.textContent = "Editar";

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.dataset.action = "delete";
        deleteButton.textContent = "Excluir";
        actions.append(editButton, deleteButton);
        article.append(actions);
    }

    return article;
}

async function loadComments(supabase, isAdmin) {
    feedbackList.setAttribute("aria-busy", "true");
    const { data, error } = await supabase
        .from("feedback_comments")
        .select("id, author_name, content, created_at")
        .order("created_at", { ascending: false });

    feedbackList.setAttribute("aria-busy", "false");
    if (error) {
        console.error("Não foi possível carregar os comentários.", error);
        showMessage(feedbackListMessage, "Não foi possível carregar os comentários. Tente novamente.", "error");
        return;
    }

    feedbackList.replaceChildren(...data.map((comment) => renderComment(comment, isAdmin)));
    showMessage(
        feedbackListMessage,
        data.length ? "" : "Ainda não há comentários. Seja a primeira pessoa a comentar."
    );
}

function createEditForm(comment) {
    const form = document.createElement("form");
    form.className = "feedback-edit-form";

    const label = document.createElement("label");
    label.textContent = "Editar comentário";
    const textarea = document.createElement("textarea");
    textarea.name = "content";
    textarea.rows = 4;
    textarea.maxLength = MAX_COMMENT_LENGTH;
    textarea.required = true;
    textarea.value = comment.content;
    label.append(textarea);

    const actions = document.createElement("div");
    actions.className = "feedback-edit-actions";
    const saveButton = document.createElement("button");
    saveButton.type = "submit";
    saveButton.textContent = "Salvar alterações";
    const cancelButton = document.createElement("button");
    cancelButton.type = "button";
    cancelButton.dataset.action = "cancel-edit";
    cancelButton.textContent = "Cancelar";
    actions.append(saveButton, cancelButton);
    form.append(label, actions);
    return form;
}

async function initializeFeedback() {
    const { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } = await loadSupabaseConfig();
    const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError && userError.name !== "AuthSessionMissingError") {
        throw userError;
    }

    if (user) {
        feedbackForm.hidden = false;
        showMessage(feedbackAuthMessage, "Você está conectado e já pode publicar um comentário.");
    } else {
        const loginLink = document.createElement("a");
        loginLink.href = "login.html";
        loginLink.textContent = "Entre na sua conta";
        feedbackAuthMessage.replaceChildren(loginLink, document.createTextNode(" para publicar um comentário."));
    }

    let isAdmin = false;
    if (user) {
        const { data, error } = await supabase.rpc("is_feedback_admin");
        if (error) {
            console.error("Não foi possível verificar as permissões administrativas.", error);
            showMessage(feedbackAuthMessage, "Não foi possível verificar as permissões administrativas.", "error");
        } else {
            isAdmin = data === true;
        }
    }

    await loadComments(supabase, isAdmin);

    feedbackForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const content = feedbackContent.value.trim();
        if (!content || content.length > MAX_COMMENT_LENGTH) {
            showMessage(feedbackAuthMessage, "O comentário deve ter entre 1 e 2.000 caracteres.", "error");
            return;
        }

        const submitButton = feedbackForm.querySelector('[type="submit"]');
        submitButton.disabled = true;
        const { error } = await supabase.from("feedback_comments").insert({ content });
        submitButton.disabled = false;

        if (error) {
            console.error("Não foi possível publicar o comentário.", error);
            showMessage(feedbackAuthMessage, "Não foi possível publicar o comentário. Tente novamente.", "error");
            return;
        }

        feedbackForm.reset();
        showMessage(feedbackAuthMessage, "Comentário publicado com sucesso.", "success");
        await loadComments(supabase, isAdmin);
    });

    feedbackList.addEventListener("click", async (event) => {
        const button = event.target.closest("button[data-action]");
        if (!button) return;
        const article = button.closest(".feedback-comment");
        if (!article) return;

        const { action } = button.dataset;
        if (action === "edit") {
            const { data: comment, error } = await supabase
                .from("feedback_comments")
                .select("content")
                .eq("id", article.dataset.commentId)
                .single();
            if (error) {
                console.error("Não foi possível abrir o comentário para edição.", error);
                showMessage(feedbackListMessage, "Não foi possível editar este comentário.", "error");
                return;
            }

            article.querySelector(".feedback-edit-form")?.remove();
            article.append(createEditForm(comment));
            article.querySelector(".feedback-edit-form textarea").focus();
            return;
        }

        if (action === "cancel-edit") {
            button.closest(".feedback-edit-form")?.remove();
            return;
        }

        if (action === "delete") {
            if (!window.confirm("Tem certeza de que deseja excluir este comentário?")) return;
            button.disabled = true;
            const { error } = await supabase
                .from("feedback_comments")
                .delete()
                .eq("id", article.dataset.commentId);
            button.disabled = false;
            if (error) {
                console.error("Não foi possível excluir o comentário.", error);
                showMessage(feedbackListMessage, "Não foi possível excluir este comentário.", "error");
                return;
            }
            showMessage(feedbackListMessage, "Comentário excluído.", "success");
            await loadComments(supabase, isAdmin);
        }
    });

    feedbackList.addEventListener("submit", async (event) => {
        if (!event.target.matches(".feedback-edit-form")) return;
        event.preventDefault();
        const form = event.target;
        const content = form.elements.content.value.trim();
        if (!content || content.length > MAX_COMMENT_LENGTH) {
            showMessage(feedbackListMessage, "O comentário deve ter entre 1 e 2.000 caracteres.", "error");
            return;
        }

        const saveButton = form.querySelector('[type="submit"]');
        saveButton.disabled = true;
        const { error } = await supabase
            .from("feedback_comments")
            .update({ content })
            .eq("id", form.closest(".feedback-comment").dataset.commentId);
        saveButton.disabled = false;

        if (error) {
            console.error("Não foi possível atualizar o comentário.", error);
            showMessage(feedbackListMessage, "Não foi possível atualizar este comentário.", "error");
            return;
        }

        showMessage(feedbackListMessage, "Comentário atualizado.", "success");
        await loadComments(supabase, isAdmin);
    });
}

initializeFeedback().catch((error) => {
    console.error("Não foi possível inicializar a seção de feedback.", error);
    showMessage(feedbackAuthMessage, "Não foi possível inicializar a seção de comentários.", "error");
    showMessage(feedbackListMessage, "Não foi possível carregar os comentários. Tente novamente.", "error");
    feedbackList.setAttribute("aria-busy", "false");
});
