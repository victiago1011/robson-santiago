/**
 * Exclusive send claims last this long.
 *
 * If a worker dies after `pending|failed` → `sending` and never calls
 * markSent/markFailed, `last_email_attempt_at` is the only clock we have
 * (no `expires_at` column). Another worker may recover the claim only when
 * that timestamp is missing or at least this old. A claim newer than this
 * window stays exclusive.
 *
 * Five minutes is longer than a typical webhook HTTP timeout and short
 * enough that a crashed send can retry on the next provider delivery.
 */
export const DIGITAL_DELIVERY_STALE_CLAIM_MS = 5 * 60 * 1000;

export function isStaleSendingClaim(
  lastEmailAttemptAt: string | null | undefined,
  nowMs: number,
  staleMs: number = DIGITAL_DELIVERY_STALE_CLAIM_MS,
): boolean {
  if (!lastEmailAttemptAt) {
    return true;
  }
  const lastMs = Date.parse(lastEmailAttemptAt);
  if (Number.isNaN(lastMs)) {
    return true;
  }
  return nowMs - lastMs >= staleMs;
}
