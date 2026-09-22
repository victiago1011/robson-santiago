"use server";

import { redirect } from "next/navigation";
import { isAdminAuthConfigured, signInWithPassword } from "@/lib/admin/auth-api";
import { clearAuthCookies, writeAuthCookies } from "@/lib/admin/session";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/server";

export type AdminLoginState = {
  error: string | null;
};

const INVALID_LOGIN = "E-mail ou senha inválidos.";
const UNAUTHORIZED = "Acesso não autorizado.";
const UNAVAILABLE = "Não foi possível entrar agora.";

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

export async function signInAdmin(
  _state: AdminLoginState,
  formData: FormData,
): Promise<AdminLoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: INVALID_LOGIN };
  }

  if (!isSupabaseConfigured() || !isAdminAuthConfigured()) {
    return { error: UNAVAILABLE };
  }

  const session = await signInWithPassword(email, password);
  if (!session) {
    return { error: INVALID_LOGIN };
  }

  const allowed = await userIsAdmin(session.userId);
  if (allowed === null) {
    return { error: UNAVAILABLE };
  }
  if (!allowed) {
    return { error: UNAUTHORIZED };
  }

  await writeAuthCookies(session);
  redirect("/admin");
}

export async function signOutAdmin(): Promise<void> {
  await clearAuthCookies();
  redirect("/admin/login");
}
