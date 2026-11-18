export const purchasePlans = Object.freeze({
    standard: Object.freeze({ label: "Standard", value: 20 }),
    plus: Object.freeze({ label: "Plus", value: 40 })
});

export const paymentMethods = Object.freeze({
    boleto: "Boleto",
    credito: "Cartão de crédito",
    debito: "Cartão de débito",
    pix: "Pix"
});

export function getPaymentMethodLabel(method) {
    return Object.hasOwn(paymentMethods, method) ? paymentMethods[method] : null;
}

export function getPurchasePlan(edition) {
    return Object.hasOwn(purchasePlans, edition) ? purchasePlans[edition] : null;
}

export function formatBRL(value) {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}
