export function getDownloadLinkState(downloadUrl) {
    if (!downloadUrl) {
        return { available: false, href: "#download-not-ready", label: "ARQUIVO DO JOGO PENDENTE" };
    }
    return { available: true, href: downloadUrl, label: "BAIXAR JOGO" };
}
