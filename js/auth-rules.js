import { getPurchasePlan } from "./purchase-rules.js";

export function validateRegistration({ name, email, password, confirmation }) {
    if (!name?.trim() || !email?.trim() || !password || !confirmation) return "required";
    if (password !== confirmation) return "password-mismatch";
    if (password.length < 8) return "password-too-short";
    return null;
}

export function validateLogin({ email, password }) {
    return email?.trim() && password ? null : "required";
}

export function getLoginDestination(returnTo, edition) {
    return returnTo === "purchase" && getPurchasePlan(edition)
        ? `download.html?edition=${encodeURIComponent(edition)}`
        : "perfil.html";
}

export function getProfileLoadAction(status, code) {
    return status === 401 || code === "missing_bearer_token" ? "login" : "message";
}

export function getEmailConfirmationRedirect(currentUrl) {
    return new URL("login.html", currentUrl).href;
}

export function getPasswordRecoveryRedirect(currentUrl) {
    return new URL("recuperar-senha.html", currentUrl).href;
}

export function isPasswordRecoveryEvent(event) {
    return event === "PASSWORD_RECOVERY";
}

export function getSafeAuthErrorDetails(error) {
    const safeCode = typeof error?.code === "string" && /^[a-z0-9_-]{1,64}$/i.test(error.code)
        ? error.code
        : typeof error?.name === "string" && /^[a-z0-9_-]{1,64}$/i.test(error.name)
            ? error.name
            : null;
    return {
        status: Number.isInteger(error?.status) ? error.status : null,
        code: safeCode
    };
}

export function getNavigationState(isAuthenticated) {
    const authenticated = Boolean(isAuthenticated);
    return { loginHidden: authenticated, logoutHidden: !authenticated };
}

export function validateProfileName(name) {
    return name?.trim().length >= 2 ? null : "name-too-short";
}

export function validatePasswordChange(password, confirmation) {
    if (password.length < 8) return "password-too-short";
    if (password !== confirmation) return "password-mismatch";
    return null;
}
