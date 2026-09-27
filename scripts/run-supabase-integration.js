import { spawnSync } from "node:child_process";

try {
    process.loadEnvFile();
} catch (error) {
    if (error.code !== "ENOENT") throw error;
}

const requiredVariables = [
    "SUPABASE_URL",
    "SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_TEST_USER_A_EMAIL",
    "SUPABASE_TEST_USER_A_PASSWORD",
    "SUPABASE_TEST_USER_B_EMAIL",
    "SUPABASE_TEST_USER_B_PASSWORD"
];
const missingVariables = requiredVariables.filter((name) => !process.env[name]);
if (missingVariables.length) {
    console.error(`Configure estas variáveis locais antes do teste: ${missingVariables.join(", ")}. Use apenas contas descartáveis.`);
    process.exit(1);
}

const result = spawnSync(
    process.execPath,
    ["--test", "tests/integration/supabase-live.test.js"],
    {
        cwd: process.cwd(),
        env: { ...process.env, RUN_SUPABASE_LIVE_TESTS: "true" },
        stdio: "inherit"
    }
);

if (result.error) throw result.error;
process.exit(result.status ?? 1);
