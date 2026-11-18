import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.116.0/+esm";
import { loadSupabaseConfig } from "./supabase-config.js";

const management = document.querySelector(".games-management");
const adminMessage = document.querySelector("#gamesAdminMessage");
const newGameButton = document.querySelector("#newGameButton");
const gamePanel = document.querySelector(".games-compose");
const gameForm = document.querySelector("#gameForm");
const gameFormMessage = document.querySelector("#gameFormMessage");
const gamesList = document.querySelector("#gamesList");
const gamesListMessage = document.querySelector("#gamesListMessage");
const cancelGameButton = document.querySelector("#cancelGameButton");
const imagePreview = document.querySelector("#gameImagePreview");
let editingGameId = null;
let editingImagePath = null;
let isAdmin = false;
let previewObjectUrl = null;

function showMessage(element, message, state = "info") {
    element.textContent = message;
    element.dataset.state = state;
}

async function requestGames(path, { method = "GET", token, payload } = {}) {
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
        throw new Error("Não foi possível conectar à API de jogos. Confira a conexão e tente novamente.", { cause: error });
    }

    let result;
    try {
        result = await response.json();
    } catch (error) {
        throw new Error(`O serviço de jogos retornou uma resposta inválida (${response.status}).`, { cause: error });
    }
    if (!response.ok) {
        const error = new Error(result.error || "Não foi possível processar a solicitação.");
        error.status = response.status;
        throw error;
    }
    return result;
}

function getApiErrorMessage(error) {
    if (error.status === 401) return "Sua sessão expirou. Entre novamente para gerenciar os jogos.";
    if (error.status === 403) return "Você não tem autorização para realizar esta operação. Somente administradores podem gerenciar os jogos.";
    return error.message || "Não foi possível processar a solicitação.";
}

function renderGame(game, admin) {
    const article = document.createElement("article");
    article.className = "game-card";
    article.dataset.gameId = game.id;
    article.dataset.imagePath = game.image_path;

    const image = document.createElement("img");
    image.className = "game-card-image";
    image.src = game.image_url;
    image.alt = `Imagem do jogo ${game.name}`;
    image.loading = "lazy";
    const title = document.createElement("h3");
    title.textContent = game.name;
    const link = document.createElement("a");
    link.className = "game-card-link";
    link.href = game.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "Acessar jogo";
    article.append(image, title, link);

    if (admin) {
        const actions = document.createElement("div");
        actions.className = "game-card-actions";
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

async function loadGames(token) {
    gamesList.setAttribute("aria-busy", "true");
    showMessage(gamesListMessage, "Carregando jogos...");
    try {
        let response;
        try {
            response = await requestGames("/api/games", { token });
        } catch (error) {
            if (error.status !== 401 || !token) throw error;
            adminMessage.hidden = false;
            showMessage(adminMessage, "Sua sessão expirou. Entre novamente para gerenciar os jogos.", "error");
            response = await requestGames("/api/games");
        }
        isAdmin = response.is_admin === true;
        gamesList.replaceChildren(...response.games.map((game) => renderGame(game, isAdmin)));
        management.hidden = !isAdmin;
        showMessage(gamesListMessage, response.games.length ? "" : "Ainda não há jogos publicados.");
        return true;
    } catch (error) {
        console.error("Não foi possível carregar os jogos.", error);
        showMessage(gamesListMessage, getApiErrorMessage(error), "error");
        return false;
    } finally {
        gamesList.setAttribute("aria-busy", "false");
    }
}

function resetGameForm() {
    editingGameId = null;
    editingImagePath = null;
    gameForm.reset();
    if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl);
    previewObjectUrl = null;
    imagePreview.removeAttribute("src");
    imagePreview.hidden = true;
    gamePanel.querySelector("h2").textContent = "Adicionar jogo";
    gameForm.querySelector('[type="submit"]').textContent = "Salvar jogo";
    showMessage(gameFormMessage, "");
}

async function getImageData(file) {
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
        throw new Error("Selecione uma imagem PNG, JPEG ou WebP.");
    }
    if (!file.size || file.size > 3 * 1024 * 1024) {
        throw new Error("A imagem deve ter até 3 MiB.");
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    let binary = "";
    for (let offset = 0; offset < bytes.length; offset += 0x8000) {
        binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
    }
    return btoa(binary);
}

async function initializeGames() {
    const { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } = await loadSupabaseConfig();
    const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
    const { data: authData, error: authError } = await supabase.auth.getSession();
    let token = authData?.session?.access_token || null;
    if (authError) {
        console.error("Não foi possível carregar a sessão para verificar permissões.", authError);
        adminMessage.hidden = false;
        showMessage(adminMessage, "Não foi possível verificar sua sessão; as ações administrativas ficam indisponíveis.", "error");
        token = null;
    }
    await loadGames(token);

    newGameButton.addEventListener("click", () => {
        resetGameForm();
        gamePanel.hidden = false;
        gameForm.elements.namedItem("name").focus();
    });

    cancelGameButton.addEventListener("click", () => {
        resetGameForm();
        gamePanel.hidden = true;
    });

    gameForm.elements.namedItem("image").addEventListener("change", () => {
        const file = gameForm.elements.namedItem("image").files[0];
        if (!file) return;
        if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl);
        previewObjectUrl = URL.createObjectURL(file);
        imagePreview.src = previewObjectUrl;
        imagePreview.hidden = false;
    });

    gameForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (!isAdmin) return;

        const name = gameForm.elements.namedItem("name").value.trim();
        const url = gameForm.elements.namedItem("url").value.trim();
        const imageFile = gameForm.elements.namedItem("image").files[0];
        if (!name || !url || (!imageFile && !editingImagePath)) {
            showMessage(gameFormMessage, "Informe o nome, o link e uma imagem para o jogo.", "error");
            return;
        }

        const submitButton = gameForm.querySelector('[type="submit"]');
        submitButton.disabled = true;
        showMessage(gameFormMessage, imageFile ? "Enviando imagem e salvando jogo..." : "Salvando jogo...");
        const gameId = editingGameId;
        try {
            let imagePath = editingImagePath;
            if (imageFile) {
                const imageData = await getImageData(imageFile);
                const uploaded = await requestGames("/api/games?action=upload-image", {
                    method: "POST",
                    token,
                    payload: { content_type: imageFile.type, image_data: imageData }
                });
                imagePath = uploaded.image_path;
            }

            await requestGames(
                gameId ? `/api/games?id=${encodeURIComponent(gameId)}` : "/api/games",
                {
                    method: gameId ? "PUT" : "POST",
                    token,
                    payload: { name, url, image_path: imagePath }
                }
            );
            await loadGames(token);
            resetGameForm();
            gamePanel.hidden = true;
            showMessage(gamesListMessage, gameId ? "Jogo editado com sucesso." : "Jogo adicionado com sucesso.", "success");
        } catch (error) {
            console.error("Falha ao salvar o jogo.", error);
            await loadGames(token);
            showMessage(gameFormMessage, getApiErrorMessage(error), "error");
        } finally {
            submitButton.disabled = false;
        }
    });

    gamesList.addEventListener("click", async (event) => {
        const button = event.target.closest("button[data-action]");
        if (!button || !isAdmin) return;
        const card = button.closest(".game-card");
        if (!card) return;

        if (button.dataset.action === "edit") {
            const title = card.querySelector("h3").textContent;
            const gameLink = card.querySelector(".game-card-link").href;
            editingGameId = card.dataset.gameId;
            editingImagePath = card.dataset.imagePath;
            gameForm.elements.namedItem("name").value = title;
            gameForm.elements.namedItem("url").value = gameLink;
            imagePreview.src = card.querySelector(".game-card-image").src;
            imagePreview.hidden = false;
            gamePanel.querySelector("h2").textContent = "Editar jogo";
            gameForm.querySelector('[type="submit"]').textContent = "Salvar alterações";
            showMessage(gameFormMessage, "");
            gamePanel.hidden = false;
            gameForm.elements.namedItem("name").focus();
            return;
        }

        if (button.dataset.action !== "delete"
            || !window.confirm("Tem certeza de que deseja excluir este jogo e sua imagem?")) return;
        button.disabled = true;
        button.textContent = "Excluindo...";
        try {
            await requestGames(`/api/games?id=${encodeURIComponent(card.dataset.gameId)}`, {
                method: "DELETE",
                token
            });
            await loadGames(token);
            showMessage(
                gamesListMessage,
                gamesList.querySelector(".game-card") ? "Jogo excluído." : "Jogo excluído. Ainda não há outros jogos publicados.",
                "success"
            );
        } catch (error) {
            console.error("Falha ao excluir o jogo.", error);
            await loadGames(token);
            showMessage(gamesListMessage, getApiErrorMessage(error), "error");
        }
    });
}

initializeGames().catch((error) => {
    console.error("Não foi possível inicializar a página de outros jogos.", error);
    gamesList.setAttribute("aria-busy", "false");
    showMessage(gamesListMessage, "Não foi possível conectar ao serviço. Verifique a configuração e tente novamente.", "error");
});
