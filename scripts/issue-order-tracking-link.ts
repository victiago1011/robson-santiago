/**
 * Ops tool: issue a one-time tracking URL for an existing physical order.
 *
 * Strategy (do NOT run against production without explicit approval):
 * 1. Apply migration `20260924120000_add_order_tracking_access.sql` manually in Supabase.
 * 2. Ensure APP_URL and SUPABASE_* are set in the local env.
 * 3. Resolve the order by internal id (preferred) or by matching friendly code offline.
 * 4. Run:
 *      npm run issue-order-tracking-link -- --order-id <uuid>
 *      # or: npx tsx --env-file=.env.local scripts/issue-order-tracking-link.ts --order-id <uuid>
 * 5. The script prints the tracking URL once to stdout and exits.
 *
 * Guarantees:
 * - Uses `@/lib/order-tracking/store-ops` (no `server-only`) so Node/tsx can load it.
 * - Inserts only token_hash (never persists raw token).
 * - Does not revoke prior authorizations.
 * - Does not insert order_email_notifications or send Resend emails.
 * - Does not write raw token to order_events, logs, or files.
 *
 * For test order #43293FA5: look up the order id in admin, then run with --order-id
 * after approval. Do not batch-backfill raw tokens.
 */

import { friendlyOrderCode } from "@/lib/admin/orders";
import { getAppUrl } from "@/lib/email/config";
import { issueOrderTrackingAccess } from "@/lib/order-tracking/create";
import { buildOrderTrackingUrl } from "@/lib/order-tracking/policy";
import { createOpsOrderTrackingStore } from "@/lib/order-tracking/store-ops";

function usage(): never {
  console.error(
    "Usage: npm run issue-order-tracking-link -- --order-id <uuid>",
  );
  process.exit(1);
}

function parseOrderId(argv: string[]): string | null {
  const idx = argv.indexOf("--order-id");
  if (idx < 0 || !argv[idx + 1]) {
    return null;
  }
  const value = argv[idx + 1].trim();
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  ) {
    return null;
  }
  return value;
}

async function main(): Promise<void> {
  const orderId = parseOrderId(process.argv.slice(2));
  if (!orderId) {
    usage();
  }

  const appUrl = getAppUrl(process.env);
  if (!appUrl) {
    console.error("APP_URL is missing or invalid.");
    process.exit(1);
  }

  const store = createOpsOrderTrackingStore();
  const result = await issueOrderTrackingAccess(orderId, store);
  if (result.status !== "created") {
    console.error(`Could not issue tracking access: ${result.reason}`);
    process.exit(1);
  }

  const snapshot = await store.findOrderSnapshot(orderId);
  const friendly = snapshot ? friendlyOrderCode(snapshot.publicId) : "(unknown)";
  const url = buildOrderTrackingUrl(appUrl, result.rawToken);

  // Print once to stdout for the operator. Do not log the raw token elsewhere.
  process.stdout.write(`${friendly}\n${url}\n`);
}

main().catch(() => {
  console.error("Unexpected failure issuing tracking link.");
  process.exit(1);
});
