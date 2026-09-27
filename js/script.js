import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.116.0/+esm";
import { API_BASE_URL, loadSupabaseConfig } from "./supabase-config.js";
import { formatBRL, getPaymentMethodLabel, getPurchasePlan, paymentMethods, purchasePlans } from "./purchase-rules.js";
import {
    getEmailConfirmationRedirect,
    getLoginDestination,
    getNavigationState,
    getPasswordRecoveryRedirect,
    getSafeAuthErrorDetails,
    getProfileLoadAction,
    validateLogin,
    validatePasswordChange,
    validateProfileName,
    validateRegistration
} from "./auth-rules.js";
import { getDownloadLinkState } from "./download-rules.js";

const { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } = await loadSupabaseConfig();
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const isPasswordRecoveryCallback = new URLSearchParams(window.location.hash.slice(1)).get("type") === "recovery";
const GAME_DOWNLOAD_URL = ""; // Configure when a release file is available.
const $ = (selector) => document.querySelector(selector);

async function apiRequest(path, { method = "GET", body } = {}) {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;
    if (!session?.access_token) {
        const error = new Error("Entre na sua conta para continuar.");
        error.code = "missing_bearer_token";
        throw error;
    }
    const response = await fetch(`${API_BASE_URL.replace(/\/+$/, "")}${path}`, {
        method,
        headers: {
            Authorization: `Bearer ${session.access_token}`,
            ...(body === undefined ? {} : { "Content-Type": "application/json" })
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
        const error = new Error(result.error || "Não foi possível concluir a solicitação.");
        error.code = result.code;
        error.tokenDiagnostic = result.tokenDiagnostic;
        error.authStatus = result.authStatus;
        error.status = response.status;
        throw error;
    }
    return result;
}

function showMessage(element, message, kind = "info") {
    if (!element) return;
    element.textContent = message;
    element.dataset.state = kind;
}

function setBusy(form, busy, buttonLabel) {
    const button = form?.querySelector('[type="submit"]');
    if (!button) return;
    if (busy) {
        button.dataset.originalLabel = button.textContent.trim();
        button.disabled = true;
        button.textContent = buttonLabel;
    } else {
        button.disabled = false;
        button.textContent = button.dataset.originalLabel || buttonLabel;
    }
}

async function getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error && error.name !== "AuthSessionMissingError") throw error;
    return user;
}

async function updateNavigation() {
    const loginButton = $(".btn-login");
    const logoutButton = $("#logoutButton");
    if (!loginButton || !logoutButton) return;
    try {
        const state = getNavigationState(Boolean(await getCurrentUser()));
        loginButton.hidden = state.loginHidden;
        logoutButton.hidden = state.logoutHidden;
    } catch (error) {
        console.error("Não foi possível carregar a sessão.", error);
        loginButton.hidden = false;
        logoutButton.hidden = true;
    }
}

const logoutButton = $("#logoutButton");
logoutButton?.addEventListener("click", async () => {
    logoutButton.disabled = true;
    const { error } = await supabase.auth.signOut();
    if (error) {
        console.error(error);
        logoutButton.disabled = false;
        return;
    }
    window.location.href = window.location.pathname.includes("/paginas/")
        ? "login.html"
        : "paginas/login.html";
});

void updateNavigation();

const signupForm = $("#formCadastro");
signupForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const name = $("#nome_usuario").value.trim();
    const email = $("#email_usuario").value.trim();
    const password = $("#senha_usuario").value;
    const confirmation = $("#confirmar").value;
    const message = $("#mensagemCadastro");

    const registrationError = validateRegistration({ name, email, password, confirmation });
    if (registrationError) {
        const messages = {
            required: "Preencha todos os campos.",
            "password-mismatch": "As senhas não coincidem.",
            "password-too-short": "A senha deve ter pelo menos 8 caracteres."
        };
        showMessage(message, messages[registrationError], "error");
        return;
    }

    setBusy(signupForm, true, "Criando conta…");
    showMessage(message, "Criando sua conta…");
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: { user_name: name, full_name: name },
            emailRedirectTo: getEmailConfirmationRedirect(window.location.href)
        }
    });
    setBusy(signupForm, false);

    if (error) {
        showMessage(message, "Não foi possível criar a conta. Confira os dados e tente novamente.", "error");
        return;
    }
    const confirmationRequired = !data.session;
    showMessage(
        message,
        confirmationRequired
            ? "Conta criada. Confirme o e-mail antes de entrar."
            : "Conta criada com sucesso. Redirecionando para o login…",
        "success"
    );
    if (!confirmationRequired) {
        window.setTimeout(() => { window.location.href = "login.html"; }, 900);
    }
});

const loginForm = $("#formLogin");
loginForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = $("#loginEmail").value.trim();
    const password = $("#loginSenha").value;
    const message = $("#mensagemLogin");
    if (validateLogin({ email, password })) {
        showMessage(message, "Digite e-mail e senha para entrar.", "error");
        return;
    }

    setBusy(loginForm, true, "Entrando…");
    showMessage(message, "Validando acesso…");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(loginForm, false);
    if (error) {
        showMessage(message, "Não foi possível entrar. Confira os dados e a confirmação do e-mail.", "error");
        return;
    }
    showMessage(message, "Login realizado. Redirecionando…", "success");
    const query = new URLSearchParams(window.location.search);
    const returnToPurchase = query.get("return") === "purchase";
    const edition = query.get("edition");
    const destination = getLoginDestination(returnToPurchase ? "purchase" : null, edition);
    window.setTimeout(() => { window.location.href = destination; }, 500);
});

const recoveryForm = $("#formRecuperacaoSenha");
recoveryForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = $("#emailRecuperacao").value.trim();
    const message = $("#mensagemRecuperacao");
    if (!email) {
        showMessage(message, "Informe seu e-mail para receber o link de recuperação.", "error");
        return;
    }

    setBusy(recoveryForm, true, "Enviando…");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: getPasswordRecoveryRedirect(window.location.href)
    });
    setBusy(recoveryForm, false);
    if (error) console.error("Falha ao solicitar recuperação de senha.", getSafeAuthErrorDetails(error));
    showMessage(
        message,
        error
            ? "Não foi possível solicitar a recuperação. Tente novamente."
            : "Se o e-mail estiver cadastrado, você receberá um link para redefinir a senha.",
        error ? "error" : "success"
    );
});

const resetPasswordForm = $("#formRedefinirSenha");
const resetPasswordMessage = $("#mensagemRedefinirSenha");
if (resetPasswordForm) {
    const recoveryForm = $("#formRecuperacaoSenha");
    const recoveryTitle = $("#tituloRecuperacao");
    const recoveryDescription = $("#descricaoRecuperacao");
    resetPasswordForm.hidden = true;

    if (isPasswordRecoveryCallback) {
        void supabase.auth.getSession().then(({ data: { session }, error }) => {
            if (error || !session) {
                showMessage($("#mensagemRecuperacao"), "Link inválido ou expirado. Solicite uma nova recuperação de senha.", "error");
                return;
            }
            recoveryForm.hidden = true;
            resetPasswordForm.hidden = false;
            recoveryTitle.textContent = "REDEFINIR SENHA";
            recoveryDescription.textContent = "Escolha uma nova senha para sua conta.";
        });
    }

    resetPasswordForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const password = $("#novaSenha").value;
        const confirmation = $("#confirmarNovaSenha").value;
        const validation = validatePasswordChange(password, confirmation);
        if (validation) {
            showMessage(resetPasswordMessage, validation === "password-too-short"
                ? "A senha deve ter pelo menos 8 caracteres."
                : "As senhas não coincidem.", "error");
            return;
        }

        setBusy(resetPasswordForm, true, "Salvando…");
        const { error } = await supabase.auth.updateUser({ password });
        setBusy(resetPasswordForm, false);
        if (error) {
            showMessage(resetPasswordMessage, "Não foi possível redefinir a senha. Solicite um novo link.", "error");
            return;
        }

        showMessage(resetPasswordMessage, "Senha redefinida com sucesso. Redirecionando ao perfil…", "success");
        window.setTimeout(() => { window.location.href = "perfil.html"; }, 900);
    });
}

const profileCard = $(".profile-card");
if (profileCard) {
    const loadProfile = async () => {
        let profile;
        try {
            profile = await apiRequest("/api/profile");
        } catch (error) {
            console.error(`Falha ao carregar o perfil. HTTP ${error.status ?? "indisponível"}; código ${error.code ?? "indisponível"}; diagnóstico do token ${error.tokenDiagnostic ?? "indisponível"}; HTTP Auth ${error.authStatus ?? "indisponível"}.`);
            if (getProfileLoadAction(error.status, error.code) === "login") {
                window.location.replace("login.html");
                return;
            }
            showMessage($("#mensagemPerfil"), "Não foi possível carregar seu perfil. Tente novamente.", "error");
            return;
        }
        const name = profile.user_name || "Usuário";
        const heading = $(".profile-card h1");
        const spans = $(".profile-info")?.querySelectorAll("div span");
        if (heading) heading.textContent = name.toLocaleUpperCase("pt-BR");
        if (spans?.[0]) spans[0].textContent = name;
        if (spans?.[1]) spans[1].textContent = profile.email || "";
        if (spans?.[2]) spans[2].textContent = profile.user_level === "plus" ? "Plus" : profile.user_level === "standard" ? "Standard" : "Nenhuma edição adquirida";
    };
    void loadProfile();
}

const passwordForm = $("#formAlterarSenha");
const nameModal = $("#modalNome");
const nameForm = $("#formNome");
$("#abrirModalNome")?.addEventListener("click", () => {
    const userName = $(".profile-info div span")?.textContent || "";
    $("#novoNome").value = userName;
    if (nameModal) nameModal.hidden = false;
    $("#novoNome")?.focus();
});
$("#fecharModalNome")?.addEventListener("click", () => {
    if (nameModal) nameModal.hidden = true;
});
nameModal?.addEventListener("click", (event) => {
    if (event.target === nameModal) nameModal.hidden = true;
});
nameForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const name = $("#novoNome").value.trim();
    const message = $("#mensagemNome");
    if (validateProfileName(name)) {
        showMessage(message, "Informe pelo menos dois caracteres.", "error");
        return;
    }
    setBusy(nameForm, true, "Salvando…");
    let updatedProfile;
    try {
        updatedProfile = await apiRequest("/api/profile", { method: "PATCH", body: { user_name: name } });
    } catch {
        setBusy(nameForm, false);
        showMessage(message, "Não foi possível atualizar o nome. Tente novamente.", "error");
        return;
    }
    setBusy(nameForm, false);
    const heading = $(".profile-card h1");
    const spans = $(".profile-info")?.querySelectorAll("div span");
    if (heading) heading.textContent = name.toLocaleUpperCase("pt-BR");
    if (spans?.[0]) spans[0].textContent = updatedProfile.user_name;
    showMessage(message, "Nome atualizado.", "success");
});

const deleteModal = $("#modalExclusao");
const deleteForm = $("#formExclusaoConta");
$("#abrirModalExclusao")?.addEventListener("click", () => {
    if (deleteModal) deleteModal.hidden = false;
    $("#confirmarExclusao")?.focus();
});
$("#fecharModalExclusao")?.addEventListener("click", () => {
    if (deleteModal) deleteModal.hidden = true;
});
deleteModal?.addEventListener("click", (event) => {
    if (event.target === deleteModal) deleteModal.hidden = true;
});
deleteForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const message = $("#mensagemExclusao");
    if ($("#confirmarExclusao").value.trim() !== "EXCLUIR") {
        showMessage(message, "Digite EXCLUIR para confirmar.", "error");
        return;
    }
    const user = await getCurrentUser().catch(() => null);
    if (!user?.email) {
        showMessage(message, "Entre novamente para excluir a conta.", "error");
        return;
    }
    setBusy(deleteForm, true, "Excluindo…");
    const { error: reauthError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: $("#senhaConfirmarExclusao").value
    });
    if (reauthError) {
        setBusy(deleteForm, false);
        showMessage(message, "Senha atual inválida. A conta não foi excluída.", "error");
        return;
    }
    let deleteError = null;
    try {
        await apiRequest("/api/account/delete", { method: "POST" });
    } catch (error) {
        deleteError = error;
    }
    setBusy(deleteForm, false);
    if (deleteError) {
        console.error("Falha na exclusão da conta.", deleteError);
        showMessage(
            message,
            deleteError.code === "ACCOUNT_DELETION_UNAVAILABLE"
                ? "A exclusão de conta ainda não foi habilitada pelo responsável do Supabase."
                : "Não foi possível excluir. Confira se a API Node.js está publicada e configurada.",
            "error"
        );
        return;
    }
    await supabase.auth.signOut();
    window.location.replace("../index.html");
});

const passwordModal = $("#modalSenha");
$("#abrirModalSenha")?.addEventListener("click", () => {
    if (passwordModal) passwordModal.hidden = false;
    $("#novaSenha")?.focus();
});
$("#fecharModalSenha")?.addEventListener("click", () => {
    if (passwordModal) passwordModal.hidden = true;
});
passwordModal?.addEventListener("click", (event) => {
    if (event.target === passwordModal) passwordModal.hidden = true;
});
passwordForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const password = $("#novaSenha").value;
    const confirmation = $("#confirmarNovaSenha").value;
    const message = $("#mensagemSenha");
    const passwordError = validatePasswordChange(password, confirmation);
    if (passwordError) {
        const messages = {
            "password-too-short": "A senha deve ter pelo menos 8 caracteres.",
            "password-mismatch": "As senhas não coincidem."
        };
        showMessage(message, messages[passwordError], "error");
        return;
    }
    setBusy(passwordForm, true, "Atualizando…");
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(passwordForm, false);
    showMessage(message, error ? "Não foi possível atualizar a senha." : "Senha atualizada.", error ? "error" : "success");
    if (!error) passwordForm.reset();
});

const purchaseList = $("#purchaseList");
const purchaseMessage = $("#purchaseMessage");
function renderOrder(order, target, downloadHistory = []) {
    const article = document.createElement("article");
    article.className = "purchase-receipt";
    const title = document.createElement("h3");
    title.textContent = `Yokai Tales — ${purchasePlans[order.edition]?.label || order.edition}`;
    const details = document.createElement("p");
    const paymentMethod = getPaymentMethodLabel(order.payment_method) || "Forma não informada";
    details.textContent = `${formatBRL(Number(order.amount_brl))} · ${paymentMethod} · Pedido simulado · ${new Date(order.created_at).toLocaleString("pt-BR")}`;
    const status = document.createElement("p");
    status.className = "purchase-status";
    status.textContent = "Pedido confirmado para fins acadêmicos. Nenhuma cobrança foi realizada.";
    article.append(title, details, status);
    const orderDownloads = downloadHistory.filter((item) => item.payment_id === order.id);
    if (orderDownloads.length) {
        const history = document.createElement("p");
        history.textContent = `Solicitações de download: ${orderDownloads.length} (última: ${new Date(orderDownloads[0].requested_at).toLocaleString("pt-BR")})`;
        article.append(history);
    }

    const download = document.createElement("a");
    download.className = "btn-primary";
    const linkState = getDownloadLinkState(GAME_DOWNLOAD_URL);
    if (linkState.available) {
        download.href = linkState.href;
        download.setAttribute("download", "");
        download.textContent = linkState.label;
        download.addEventListener("click", async (event) => {
            event.preventDefault();
            download.setAttribute("aria-disabled", "true");
            try {
                await apiRequest("/api/downloads", { method: "POST", body: { payment_id: order.id } });
            } catch (error) {
                console.error("Não foi possível registrar a solicitação de download.", error);
                showMessage(purchaseMessage, "Não foi possível registrar o download. Tente novamente.", "error");
                download.removeAttribute("aria-disabled");
                return;
            }
            window.location.assign(linkState.href);
        });
    } else {
        download.href = linkState.href;
        download.textContent = linkState.label;
        download.setAttribute("aria-disabled", "true");
        download.addEventListener("click", (event) => {
            event.preventDefault();
            showMessage(purchaseMessage, "O pedido foi registrado, mas o arquivo de download ainda não foi publicado.", "error");
        });
    }
    article.append(download);
    target.append(article);
}

async function loadPurchaseHistory() {
    if (!purchaseList) return;
    purchaseList.replaceChildren();
    let result;
    try {
        result = await apiRequest("/api/payments");
    } catch (error) {
        showMessage(purchaseMessage, `${error.message} Confira a API Node.js e a migração do Supabase.`, "error");
        return;
    }
    if (!result.payments.length) {
        showMessage(purchaseMessage, "Nenhum pedido registrado nesta conta.");
        return;
    }
    for (const order of result.payments) renderOrder(order, purchaseList, result.downloads);
}

if ($("#purchaseForm")) {
    const purchaseForm = $("#purchaseForm");
    const editionInput = $("#edition");
    const paymentMethodInput = $("#paymentMethod");
    const priceOutput = $("#editionPrice");
    const updatePrice = () => {
        const plan = getPurchasePlan(editionInput.value);
        priceOutput.textContent = plan ? formatBRL(plan.value) : "Selecione uma versão";
    };
    const requestedEdition = new URLSearchParams(window.location.search).get("edition");
    if (getPurchasePlan(requestedEdition)) editionInput.value = requestedEdition;
    editionInput.addEventListener("change", updatePrice);
    updatePrice();

    purchaseForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const user = await getCurrentUser().catch(() => null);
        if (!user) {
            const loginLink = $("#purchaseLoginLink a");
            if (loginLink) {
                loginLink.href = `login.html?return=purchase&edition=${encodeURIComponent(editionInput.value)}`;
                $("#purchaseLoginLink").hidden = false;
            }
            showMessage(purchaseMessage, "Entre na sua conta para registrar o pedido.", "error");
            return;
        }
        const edition = editionInput.value;
        if (!purchasePlans[edition]) {
            showMessage(purchaseMessage, "Escolha uma versão válida.", "error");
            return;
        }
        const paymentMethod = paymentMethodInput.value;
        if (!Object.hasOwn(paymentMethods, paymentMethod)) {
            showMessage(purchaseMessage, "Escolha uma forma de pagamento válida.", "error");
            return;
        }

        setBusy(purchaseForm, true, "Confirmando pedido…");
        showMessage(purchaseMessage, "Registrando a simulação…");
        let order;
        let orderError;
        try {
            order = await apiRequest("/api/payments", { method: "POST", body: { edition, payment_method: paymentMethod } });
        } catch (error) {
            orderError = error;
        }
        setBusy(purchaseForm, false);

        if (orderError) {
            console.error("Falha ao registrar o pedido simulado.", orderError);
            showMessage(purchaseMessage, `${orderError.message} Confira a API Node.js e a migração do Supabase.`, "error");
            return;
        }
        showMessage(purchaseMessage, `Pedido confirmado: ${formatBRL(Number(order.amount_brl))}.`, "success");
        await loadPurchaseHistory();
    });

    void getCurrentUser().then((user) => {
        const loginLink = $("#purchaseLoginLink");
        if (loginLink) {
            loginLink.hidden = Boolean(user);
            const anchor = loginLink.querySelector("a");
            if (anchor) anchor.href = `login.html?return=purchase&edition=${encodeURIComponent(editionInput.value)}`;
        }
        if (user) void loadPurchaseHistory();
    }).catch((error) => {
        console.error("Não foi possível verificar a sessão.", error);
    });
}
