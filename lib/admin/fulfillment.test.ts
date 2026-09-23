import assert from "node:assert/strict";
import { test } from "node:test";
import {
  decideConfirmShipment,
  decideStartPreparation,
  isValidCorreiosTrackingCode,
  normalizeTrackingCode,
  type FulfillmentOrderSnapshot,
} from "@/lib/admin/fulfillment";
import { DIGITAL_SKU, PHYSICAL_SKU } from "@/lib/commerce/selection";
import { assertNoSensitiveFields } from "@/lib/payments/sanitize";

const ORDER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function order(overrides?: Partial<FulfillmentOrderSnapshot>): FulfillmentOrderSnapshot {
  return {
    id: ORDER_ID,
    paymentStatus: "approved",
    fulfillmentStatus: "pending",
    trackingCode: null,
    items: [{ sku: PHYSICAL_SKU }],
    ...overrides,
  };
}

test("normalizeTrackingCode remove espaços e hífens e uppercasa", () => {
  assert.equal(normalizeTrackingCode(" ab-123456789-br "), "AB123456789BR");
});

test("isValidCorreiosTrackingCode aceita SRO padrão", () => {
  assert.equal(isValidCorreiosTrackingCode("AB123456789BR"), true);
  assert.equal(isValidCorreiosTrackingCode("ab123456789br"), false);
  assert.equal(isValidCorreiosTrackingCode("AB12345BR"), false);
  assert.equal(isValidCorreiosTrackingCode(""), false);
});

test("iniciar preparação exige físico + approved + pending", () => {
  assert.equal(decideStartPreparation(order()).ok, true);
  assert.equal(
    decideStartPreparation(order({ paymentStatus: "pending" })).ok,
    false,
  );
  assert.equal(
    decideStartPreparation(order({ items: [{ sku: DIGITAL_SKU }] })).ok,
    false,
  );
  assert.equal(
    decideStartPreparation(order({ fulfillmentStatus: "preparing" })).ok,
    false,
  );
  assert.equal(
    decideStartPreparation(order({ fulfillmentStatus: "cancelled" })).ok,
    false,
  );
});

test("confirmar postagem exige preparing + rastreio válido", () => {
  const preparing = order({ fulfillmentStatus: "preparing" });
  const ok = decideConfirmShipment(preparing, "ab 123456789 br");
  assert.equal(ok.ok, true);
  if (ok.ok) {
    assert.equal(ok.trackingCode, "AB123456789BR");
  }

  assert.equal(decideConfirmShipment(order(), "AB123456789BR").ok, false);
  assert.equal(
    decideConfirmShipment(preparing, "INVALID").ok,
    false,
  );
  assert.equal(
    decideConfirmShipment(order({ fulfillmentStatus: "shipped" }), "AB123456789BR").ok,
    false,
  );
  assert.equal(
    decideConfirmShipment(
      order({ fulfillmentStatus: "preparing", paymentStatus: "pending" }),
      "AB123456789BR",
    ).ok,
    false,
  );
  assert.equal(
    decideConfirmShipment(
      order({ fulfillmentStatus: "preparing", items: [{ sku: DIGITAL_SKU }] }),
      "AB123456789BR",
    ).ok,
    false,
  );
});

test("decisões de fulfillment não embutem secrets", () => {
  const decision = decideConfirmShipment(
    order({ fulfillmentStatus: "preparing" }),
    "AB123456789BR",
  );
  assert.doesNotThrow(() => assertNoSensitiveFields(decision));
});
