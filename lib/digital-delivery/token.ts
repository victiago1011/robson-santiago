import { createHash, randomBytes } from "node:crypto";

export type DigitalDeliveryToken = {
  rawToken: string;
  tokenHash: string;
};

export function hashDigitalDeliveryToken(rawToken: string): string {
  return createHash("sha256").update(rawToken, "utf8").digest("hex");
}

export function generateDigitalDeliveryToken(): DigitalDeliveryToken {
  const rawToken = randomBytes(32).toString("base64url");
  return {
    rawToken,
    tokenHash: hashDigitalDeliveryToken(rawToken),
  };
}
