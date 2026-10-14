export const API_BASE_URL = "";

export async function loadSupabaseConfig() {
    const response = await fetch(`${API_BASE_URL}/api/config`, { cache: "no-store" });
    if (!response.ok) throw new Error("Não foi possível carregar a configuração do serviço.");

    const config = await response.json();
    if (typeof config.supabaseUrl !== "string" || typeof config.supabasePublishableKey !== "string") {
        throw new Error("A configuração do serviço está incompleta.");
    }

    return {
        SUPABASE_URL: config.supabaseUrl,
        SUPABASE_PUBLISHABLE_KEY: config.supabasePublishableKey
    };
}
