export type BrickSubmitResolution = "resolve" | "reject";

export type BrickSubmitOutcome =
  | { type: "validation_error" }
  | { type: "request_error" }
  | { type: "rejected" }
  | { type: "cancelled" }
  | { type: "refunded" }
  | { type: "recoverable" }
  | { type: "awaiting_pix" }
  | { type: "approved" };

/**
 * The Payment Brick locks its submit button when onSubmit resolves.
 * Resolve only when this checkout unmounts the Brick.
 */
export function decideBrickSubmitResolution(outcome: BrickSubmitOutcome): BrickSubmitResolution {
  if (outcome.type === "awaiting_pix" || outcome.type === "approved") {
    return "resolve";
  }
  return "reject";
}

export class BrickSubmitRejected extends Error {
  constructor() {
    super("BRICK_SUBMIT_REJECTED");
    this.name = "BrickSubmitRejected";
  }
}

export function brickSubmitOutcomeFromPayment(input: {
  ok: boolean;
  code?: string;
  method?: "pix" | "credit_card" | null;
  status?: string | null;
  hasPix?: boolean;
}): BrickSubmitOutcome {
  if (!input.ok) {
    return input.code === "VALIDATION_ERROR" ? { type: "validation_error" } : { type: "request_error" };
  }
  if (input.status === "approved") {
    return { type: "approved" };
  }
  if (input.method === "pix" && input.hasPix) {
    return { type: "awaiting_pix" };
  }
  if (input.status === "rejected") {
    return { type: "rejected" };
  }
  if (input.status === "cancelled") {
    return { type: "cancelled" };
  }
  if (input.status === "refunded") {
    return { type: "refunded" };
  }
  return { type: "recoverable" };
}
