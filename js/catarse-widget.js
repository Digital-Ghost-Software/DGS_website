const widget = document.querySelector("#catarseWidget");
const message = document.querySelector("#catarseWidgetMessage");
const campaignUrl = "https://www.catarse.com.br/yokai-tales?ref=ctrse_profile_campaigns_live_project_card";
const statusLabels = {
    Launch: "Campanha no ar",
    Prelaunch: "Em breve",
    Successful: "Campanha concluída",
    Failed: "Campanha encerrada",
    Ended: "Campanha encerrada"
};

function createElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text) element.textContent = text;
    return element;
}

function formatCampaignEndDate(value) {
    if (typeof value !== "string" || !value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(date);
}

function renderReward(reward) {
    const card = createElement("article", "catarse-reward");
    const name = createElement("h4", "", reward.name);
    const value = createElement(
        "p",
        "catarse-reward__value",
        new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(reward.value / 100)
    );
    const description = createElement("p", "", reward.description?.split(/\r?\n/, 1)[0] || "Apoie o projeto e confira os detalhes no Catarse.");
    card.append(name, value, description);
    return card;
}

function renderCampaign(data) {
    const panel = document.createElement("div");
    const header = createElement("div", "catarse-widget__header");
    const title = createElement("h2", "", "Yokai Tales");
    const status = createElement("span", "catarse-widget__status", statusLabels[data.status] || "Confira a campanha");
    const endDate = formatCampaignEndDate(data.endDate);
    header.append(title, status);

    const details = createElement(
        "p",
        "catarse-widget__details",
        endDate
            ? `A campanha termina em ${endDate}.`
            : "Confira o período da campanha diretamente no Catarse."
    );

    panel.append(header, details);

    if (data.rewards.length) {
        panel.append(createElement("h3", "catarse-widget__rewards-title", "Recompensas disponíveis"));
        const rewards = createElement("div", "catarse-widget__rewards");
        data.rewards.forEach((reward) => rewards.append(renderReward(reward)));
        panel.append(rewards);
    }

    const actions = createElement("div", "catarse-widget__actions");
    const supportLink = createElement("a", "btn-primary", "Apoiar no Catarse");
    supportLink.href = campaignUrl;
    supportLink.target = "_blank";
    supportLink.rel = "noopener noreferrer";
    actions.append(supportLink);
    panel.append(actions);
    widget.replaceChildren(panel);
}

async function loadCampaign() {
    if (!widget || !message) return;

    try {
        const response = await fetch("/api/catarse/yokai-tales");
        if (!response.ok) throw new Error(`A API do projeto respondeu com HTTP ${response.status}.`);

        const result = await response.json();
        if (!result || result.slug !== "yokai-tales" || typeof result.status !== "string"
            || !Array.isArray(result.rewards)) {
            throw new Error("A API retornou dados de campanha inválidos.");
        }

        renderCampaign(result);
    } catch (error) {
        console.error("Não foi possível carregar a campanha do Catarse.", error);
        message.dataset.state = "error";
        message.textContent = "Não foi possível carregar as informações agora.";
        const link = createElement("a", "", "Acesse Yokai Tales diretamente no Catarse.");
        link.href = campaignUrl;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        const fallback = createElement("p", "catarse-widget__fallback");
        fallback.append(link);
        widget.replaceChildren(message, fallback);
    }
}

void loadCampaign();
