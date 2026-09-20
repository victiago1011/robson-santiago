import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";
import { generateDigitalDeliveryToken, hashDigitalDeliveryToken } from "@/lib/digital-delivery/token";
import { assertNoSensitiveFields } from "@/lib/payments/sanitize";

test("token bruto é base64url e hash é SHA-256 hex", () => {
  const token = generateDigitalDeliveryToken();
  assert.match(token.rawToken, /^[A-Za-z0-9_-]+$/);
  assert.equal(token.tokenHash.length, 64);
  assert.match(token.tokenHash, /^[a-f0-9]{64}$/);
  assert.equal(token.tokenHash, createHash("sha256").update(token.rawToken, "utf8").digest("hex"));
  assert.equal(token.tokenHash, hashDigitalDeliveryToken(token.rawToken));
  assert.notEqual(token.tokenHash, token.rawToken);
});

test("hashDigitalDeliveryToken é determinístico", () => {
  assert.equal(hashDigitalDeliveryToken("abc"), hashDigitalDeliveryToken("abc"));
  assert.notEqual(hashDigitalDeliveryToken("abc"), hashDigitalDeliveryToken("abd"));
});

test("objeto do token não entra em payload público sanitizado", () => {
  const token = generateDigitalDeliveryToken();
  assert.throws(() => assertNoSensitiveFields({ token: token.rawToken }));
});
