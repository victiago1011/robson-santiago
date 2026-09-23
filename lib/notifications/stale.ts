import {
  DIGITAL_DELIVERY_STALE_CLAIM_MS,
  isStaleSendingClaim,
} from "@/lib/digital-delivery/stale";

/** Same reclaim window as digital delivery email claims. */
export const ORDER_EMAIL_STALE_CLAIM_MS = DIGITAL_DELIVERY_STALE_CLAIM_MS;

export { isStaleSendingClaim };
