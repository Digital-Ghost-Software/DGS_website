import assert from "node:assert/strict";
import test from "node:test";
import { formatBRL, getPaymentMethodLabel, getPurchasePlan, paymentMethods, purchasePlans } from "../../js/purchase-rules.js";

test("the Standard edition has the required simulated price", () => {
    assert.deepEqual(getPurchasePlan("standard"), { label: "Standard", value: 20 });
});

test("the Plus edition has the required simulated price", () => {
    assert.deepEqual(getPurchasePlan("plus"), { label: "Plus", value: 40 });
});

test("unknown editions are rejected and the catalog cannot be changed", () => {
    assert.equal(getPurchasePlan("premium"), null);
    assert.equal(getPurchasePlan("toString"), null);
    assert.equal(Object.isFrozen(purchasePlans), true);
    assert.equal(Object.isFrozen(purchasePlans.standard), true);
});

test("prices are formatted in Brazilian reais", () => {
    assert.equal(formatBRL(getPurchasePlan("standard").value), "R$ 20,00");
    assert.equal(formatBRL(getPurchasePlan("plus").value), "R$ 40,00");
});

test("payment methods preserve credit and debit choices with Portuguese labels", () => {
    assert.deepEqual(paymentMethods, {
        boleto: "Boleto",
        credito: "Cartão de crédito",
        debito: "Cartão de débito",
        pix: "Pix"
    });
    assert.equal(getPaymentMethodLabel("pix"), "Pix");
    assert.equal(getPaymentMethodLabel("credito"), "Cartão de crédito");
    assert.equal(getPaymentMethodLabel("debito"), "Cartão de débito");
    assert.equal(getPaymentMethodLabel("unknown"), null);
});
