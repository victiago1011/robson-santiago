export type AdminAccess =
  | { ok: true; userId: string }
  | { ok: false; reason: "anonymous" | "forbidden" | "unavailable" };

export function decideAdminAccess(input: {
  configured: boolean;
  userId: string | null;
  isAdmin: boolean;
}): AdminAccess {
  if (!input.configured) {
    return { ok: false, reason: "unavailable" };
  }
  if (!input.userId) {
    return { ok: false, reason: "anonymous" };
  }
  if (!input.isAdmin) {
    return { ok: false, reason: "forbidden" };
  }
  return { ok: true, userId: input.userId };
}
