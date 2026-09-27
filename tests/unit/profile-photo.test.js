import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";
import { DEFAULT_PROFILE_PHOTO, getProfilePhotoSource } from "../../js/profile-rules.js";

test("profile without a stored photo uses the bundled default avatar", () => {
    assert.equal(DEFAULT_PROFILE_PHOTO, "/imagens/user-img-default.jpg");
    assert.equal(getProfilePhotoSource(null), DEFAULT_PROFILE_PHOTO);
    assert.equal(getProfilePhotoSource(""), DEFAULT_PROFILE_PHOTO);
    assert.equal(getProfilePhotoSource("   "), DEFAULT_PROFILE_PHOTO);
});

test("profile preserves a non-empty configured photo path", () => {
    assert.equal(getProfilePhotoSource("/imagens/custom.jpg"), "/imagens/custom.jpg");
    assert.equal(getProfilePhotoSource(" /imagens/custom.jpg "), "/imagens/custom.jpg");
});

test("default profile photo asset exists in the public images directory", async () => {
    await access("imagens/user-img-default.jpg");
});

test("profile page starts with the default photo and applies the profile photo on load", async () => {
    const page = await readFile("paginas/perfil.html", "utf8");
    const script = await readFile("js/script.js", "utf8");
    assert.match(page, /id="fotoPerfilUsuario"[\s\S]*?src="\/imagens\/user-img-default\.jpg"/);
    assert.match(script, /profilePhoto\.src = getProfilePhotoSource\(profile\.user_foto\)/);
});
