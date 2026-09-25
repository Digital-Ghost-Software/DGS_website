import assert from "node:assert/strict";
import test from "node:test";
import {
    getEmailConfirmationRedirect,
    getLoginDestination,
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

test("email confirmation returns to login on the same serving domain", () => {
    assert.equal(
        getEmailConfirmationRedirect("https://preview.example/paginas/cadastro.html"),
        "https://preview.example/paginas/login.html"
    );
});

test("profile name and password updates enforce the documented minimums", () => {
    assert.equal(validateProfileName(" A "), "name-too-short");
    assert.equal(validateProfileName(" Ana "), null);
    assert.equal(validatePasswordChange("short", "short"), "password-too-short");
    assert.equal(validatePasswordChange("password", "different"), "password-mismatch");
    assert.equal(validatePasswordChange("password", "password"), null);
});
