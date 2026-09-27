import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

test("README instructions match the current Supabase project and local setup", async () => {
    const readme = await readFile("README.md", "utf8");

    assert.match(readme, /database\/ddl\/new-project-schema\.sql/);
    assert.match(readme, /database\/ddl\/default-profile-photo\.sql/);
    assert.match(readme, /SUPABASE_URL/);
    assert.match(readme, /SUPABASE_PUBLISHABLE_KEY/);
    assert.match(readme, /npm ci/);
    assert.match(readme, /npm start/);
    assert.match(readme, /paginas\/recuperar-senha\.html/);
    assert.doesNotMatch(readme, /\.env\.example|database\/ddl\/rf-004-simulated-payments\.sql/);

    for (const [, target] of readme.matchAll(/\]\(([^)]+)\)/g)) {
        if (/^https?:\/\//i.test(target) || target.startsWith("#")) continue;
        await access(target);
    }
});

test("RF-001 to RF-004 reports distinguish verified behavior from remaining deployment work", async () => {
    const [rf001, rf002, rf003, rf004] = await Promise.all([
        readFile("Docs/requisitos/RF-001-login.md", "utf8"),
        readFile("Docs/requisitos/RF-002-cadastro-usuario.md", "utf8"),
        readFile("Docs/requisitos/RF-003-gerenciar-download-do-jogo.md", "utf8"),
        readFile("Docs/requisitos/RF-004-gestao-pagamentos.md", "utf8")
    ]);

    assert.match(rf001, /Supabase Auth validado com contas de teste/);
    assert.match(rf001, /recuperação de senha foram confirmados/);
    assert.match(rf001, /Deploy de produção.*pendentes/);
    assert.doesNotMatch(rf001, /teste com projeto configurado ainda pendente/);

    assert.match(rf002, /Cadastro, confirmação de e-mail, perfil, edição de nome e responsividade foram validados/);
    assert.match(rf002, /responsividade foram validados\. Exclusão real e deploy permanecem pendentes/i);
    assert.doesNotMatch(rf002, /execução integrada ainda precisa ser validada/);

    assert.match(rf003, /Teste live com duas contas confirmou/);
    assert.match(rf003, /arquivo\/URL de release ainda não existem/);
    assert.doesNotMatch(rf003, /Teste com duas contas pendente/);

    assert.match(rf004, /testes live de duas contas, histórico de compras e responsividade passaram/);
    assert.match(rf004, /Deploy Vercel.*permanecem pendentes/);
    assert.match(rf004, /\[x\] Standard persiste R\$ 20,00 e Plus R\$ 40,00/);
    assert.doesNotMatch(rf004, /Pendente de execução após aplicar SQL/);
});
