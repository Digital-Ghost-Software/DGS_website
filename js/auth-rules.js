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

export function getProfileLoadAction(status) {
    return status === 401 ? "login" : "message";
}

export function getEmailConfirmationRedirect(currentUrl) {
    return new URL("login.html", currentUrl).href;
}

export function validateProfileName(name) {
    return name?.trim().length >= 2 ? null : "name-too-short";
}

export function validatePasswordChange(password, confirmation) {
    if (password.length < 8) return "password-too-short";
    if (password !== confirmation) return "password-mismatch";
    return null;
}
