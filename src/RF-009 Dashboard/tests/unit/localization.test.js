import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = process.cwd();

test("public HTML uses Portuguese labels and has no English placeholder copy", async () => {
    const pageFiles = (await readdir(path.join(root, "paginas"))).filter((file) => file.endsWith(".html")).map((file) => path.join("paginas", file));
    const pages = await Promise.all(pageFiles.map((file) => readFile(path.join(root, file), "utf8")));
    const html = pages.join("\n");

    for (const leftover of ["Lorem ipsum", ">Download<", ">Login<", ">Logout<", ">GAMES<"]) {
        assert.equal(html.includes(leftover), false, `Unexpected English UI text: ${leftover}`);
    }
    assert.match(html, />Comprar</);
    assert.match(html, />Entrar</);
    assert.match(html, />Sair</);
    const checkoutPage = await readFile(path.join(root, "paginas", "download.html"), "utf8");
    assert.match(checkoutPage, /Cartão de crédito/);
    assert.match(checkoutPage, /Cartão de débito/);
    assert.match(checkoutPage, /Pix/);
    assert.match(checkoutPage, /Boleto/);
    assert.match(checkoutPage, /não serão armazenados pelo site/);
    assert.match(await readFile(path.join(root, "paginas", "login.html"), "utf8"), /Esqueci minha senha/);
    assert.match(await readFile(path.join(root, "paginas", "recuperar-senha.html"), "utf8"), /Informe seu e-mail/);
    const recoveryPage = await readFile(path.join(root, "paginas", "recuperar-senha.html"), "utf8");
    assert.match(recoveryPage, /formRecuperacaoSenha/);
    assert.match(recoveryPage, /formRedefinirSenha/);
    assert.match(recoveryPage, /<form id="formRedefinirSenha" hidden>/);
    assert.match(recoveryPage, /<label for="novaSenha">Nova senha<\/label>/);
    const stylesheet = await readFile(path.join(root, "css", "style.css"), "utf8");
    assert.match(stylesheet, /\.form-container\s+form\[hidden\]\s*\{\s*display:\s*none\s*!important;/);

    const home = await readFile(path.join(root, "index.html"), "utf8");
    assert.match(home, />\s*(?:Download|Comprar)\s*</);
    assert.match(home, /Lorem ipsum dolor sit amet/);
});

test("client does not expose raw authentication provider errors to users", async () => {
    const script = await readFile(path.join(root, "js", "script.js"), "utf8");
    assert.doesNotMatch(script, /new Error\("Authentication required"\)/);
    assert.match(script, /new Error\("Entre na sua conta para continuar\."\)/);
    assert.match(script, /Não foi possível criar a conta\. Confira os dados e tente novamente\./);
    assert.match(script, /Não foi possível atualizar o nome\. Tente novamente\./);
    assert.match(script, /Falha ao solicitar recuperação de senha\./);
    assert.match(script, /getSafeAuthErrorDetails\(error\)/);
    assert.doesNotMatch(script, /console\.error\([^\n]*error\.message/);
});
