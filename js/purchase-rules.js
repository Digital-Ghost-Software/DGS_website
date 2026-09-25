export const purchasePlans = Object.freeze({
    standard: Object.freeze({ label: "Standard", value: 20 }),
    plus: Object.freeze({ label: "Plus", value: 40 })
});

export function getPurchasePlan(edition) {
    return Object.hasOwn(purchasePlans, edition) ? purchasePlans[edition] : null;
}

export function formatBRL(value) {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}
