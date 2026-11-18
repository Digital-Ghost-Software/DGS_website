async function recordPageVisit() {
    try {
        const response = await fetch("/api/analytics/visit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ page_path: window.location.pathname }),
            keepalive: true
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
    } catch (error) {
        console.error("Não foi possível registrar a visita da página.", error);
    }
}

void recordPageVisit();
