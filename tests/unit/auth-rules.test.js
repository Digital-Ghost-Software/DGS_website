import assert from "node:assert/strict";
import test from "node:test";
import {
    getEmailConfirmationRedirect,
    getLoginDestination,
    getNavigationState,
    getPasswordRecoveryRedirect,
    getProfileLoadAction,
    getSafeAuthErrorDetails,
    validateLogin,
    validatePasswordChange,
    validateProfileName,
    validateRegistration
} from "../../js/auth-rules.js";

test("registration requires every field, matching passwords, and at least eight characters", () => {
    assert.equal(validateRegistration({ name: " ", email: "a@example.invalid", password: "password", confirmation: "password" }), "required");
    assert.equal(validateRegistration({ name: "A", email: "a@example.invalid", password: "password", confirmation: "different" }), "password-mismatch");
    assert.equal(validateRegistration({ name: "A", email: "a@example.invalid", password: "short", confirmation: "short" }), "password-too-short");
    assert.equal(validateRegistration({ name: "A", email: "a@example.invalid", password: "password", confirmation: "password" }), null);
});

test("login requires an email and password", () => {
    assert.equal(validateLogin({ email: "  ", password: "secret" }), "required");
    assert.equal(validateLogin({ email: "a@example.invalid", password: "" }), "required");
    assert.equal(validateLogin({ email: " a@example.invalid ", password: "secret" }), null);
});

test("checkout return preserves only supported editions", () => {
    assert.equal(getLoginDestination("purchase", "plus"), "download.html?edition=plus");
    assert.equal(getLoginDestination("purchase", "unknown edition"), "perfil.html");
    assert.equal(getLoginDestination("other", "standard"), "perfil.html");
});

test("profile redirects only when the API reports an unauthenticated session", () => {
    assert.equal(getProfileLoadAction(401), "login");
    assert.equal(getProfileLoadAction(undefined, "missing_bearer_token"), "login");
    assert.equal(getProfileLoadAction(403), "message");
    assert.equal(getProfileLoadAction(503), "message");
    assert.equal(getProfileLoadAction(undefined), "message");
});

test("email confirmation returns to login on the same serving domain", () => {
    assert.equal(
        getEmailConfirmationRedirect("https://preview.example/paginas/cadastro.html"),
        "https://preview.example/paginas/login.html"
    );
});

test("password recovery returns to the shared two-state recovery page", () => {
    assert.equal(
        getPasswordRecoveryRedirect("http://localhost:3000/paginas/recuperar-senha.html"),
        "http://localhost:3000/paginas/recuperar-senha.html"
    );
});

test("navigation shows only the action matching the authentication state", () => {
    assert.deepEqual(getNavigationState(false), { loginHidden: false, logoutHidden: true });
    assert.deepEqual(getNavigationState(true), { loginHidden: true, logoutHidden: false });
});

test("recovery diagnostics expose only a safe HTTP status and error code", () => {
    assert.deepEqual(getSafeAuthErrorDetails({
        status: 429,
        code: "over_email_send_rate_limit",
        message: "private user detail"
    }), { status: 429, code: "over_email_send_rate_limit" });
    assert.deepEqual(getSafeAuthErrorDetails({
        status: 400,
        code: "sensitive value with spaces",
        name: "AuthApiError",
        message: "private user detail"
    }), { status: 400, code: "AuthApiError" });
    assert.deepEqual(getSafeAuthErrorDetails(new Error("private user detail")), { status: null, code: "Error" });
});

test("profile name and password updates enforce the documented minimums", () => {
    assert.equal(validateProfileName(" A "), "name-too-short");
    assert.equal(validateProfileName(" Ana "), null);
    assert.equal(validatePasswordChange("short", "short"), "password-too-short");
    assert.equal(validatePasswordChange("password", "different"), "password-mismatch");
    assert.equal(validatePasswordChange("password", "password"), null);
});
