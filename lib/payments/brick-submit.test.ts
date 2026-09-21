import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import {
  brickSubmitOutcomeFromPayment,
  decideBrickSubmitResolution,
} from "@/lib/payments/brick-submit";

function resolution(input: Parameters<typeof brickSubmitOutcomeFromPayment>[0]) {
  return decideBrickSubmitResolution(brickSubmitOutcomeFromPayment(input));
}

test("VALIDATION_ERROR, rejected, cancelled e erro recuperável rejeitam o callback", () => {
  assert.equal(resolution({ ok: false, code: "VALIDATION_ERROR" }), "reject");
  assert.equal(resolution({ ok: false, code: "PAYMENT_FAILED" }), "reject");
  assert.equal(
    resolution({ ok: true, method: "credit_card", status: "rejected", hasPix: false }),
    "reject",
  );
  assert.equal(
    resolution({ ok: true, method: "credit_card", status: "cancelled", hasPix: false }),
    "reject",
  );
  assert.equal(
    resolution({ ok: true, method: "credit_card", status: "in_process", hasPix: false }),
    "reject",
  );
  assert.equal(resolution({ ok: true, method: "pix", status: "refunded", hasPix: false }), "reject");
});

test("Pix criado e pagamento aprovado resolvem o callback", () => {
  assert.equal(
    resolution({ ok: true, method: "pix", status: "pending", hasPix: true }),
    "resolve",
  );
  assert.equal(
    resolution({ ok: true, method: "credit_card", status: "approved", hasPix: false }),
    "resolve",
  );
  assert.equal(
    resolution({ ok: true, method: "pix", status: "approved", hasPix: true }),
    "resolve",
  );
});

test("CheckoutForm rejeita o Brick sem remontar a instância", () => {
  const form = readFileSync(join(process.cwd(), "components/checkout/CheckoutForm.tsx"), "utf8");
  const brick = readFileSync(
    join(process.cwd(), "components/checkout/MercadoPagoPaymentBrick.tsx"),
    "utf8",
  );

  assert.match(form, /throw new BrickSubmitRejected\(\)/);
  assert.match(form, /if \(error instanceof BrickSubmitRejected\)/);
  assert.match(form, /decideBrickSubmitResolution\(/);
  assert.match(brick, /useCallback\(async \(form: unknown\) => \{[\s\S]*?\}, \[\]\)/);
  assert.equal(brick.includes("key="), false);
});
