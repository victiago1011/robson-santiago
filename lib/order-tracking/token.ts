import { createHash, randomBytes } from "node:crypto";

export type OrderTrackingToken = {
  rawToken: string;
  tokenHash: string;
};

export function hashOrderTrackingToken(rawToken: string): string {
  return createHash("sha256").update(rawToken, "utf8").digest("hex");
}

export function generateOrderTrackingToken(): OrderTrackingToken {
  const rawToken = randomBytes(32).toString("base64url");
  return {
    rawToken,
    tokenHash: hashOrderTrackingToken(rawToken),
  };
}
