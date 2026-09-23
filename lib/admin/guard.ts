import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { fetchAuthUserId, isAdminAuthConfigured } from "@/lib/admin/auth-api";
import { decideAdminAccess, type AdminAccess } from "@/lib/admin/access";
import { readAccessToken } from "@/lib/admin/session";
import { isSupabaseConfigured, getSupabase } from "@/lib/supabase/server";

async function userIsAdmin(userId: string): Promise<boolean | null> {
  const { data, error } = await getSupabase()
    .from("admin_users")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    return null;
  }

  return Boolean(data?.user_id);
}

export const resolveAdminAccess = cache(async (): Promise<AdminAccess> => {
  const accessToken = await readAccessToken();
  if (!accessToken) {
    return { ok: false, reason: "anonymous" };
  }

  if (!isSupabaseConfigured() || !isAdminAuthConfigured()) {
    return { ok: false, reason: "unavailable" };
  }

  const userId = await fetchAuthUserId(accessToken);
  if (!userId) {
    return decideAdminAccess({ configured: true, userId: null, isAdmin: false });
  }

  const allowed = await userIsAdmin(userId);
  if (allowed === null) {
    return { ok: false, reason: "unavailable" };
  }

  return decideAdminAccess({ configured: true, userId, isAdmin: allowed });
});

export async function requireAdminPage(): Promise<boolean> {
  const access = await resolveAdminAccess();
  if (access.ok) {
    return true;
  }
  if (access.reason === "anonymous") {
    redirect("/admin/login");
  }
  return false;
}
