import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export class SupabaseNotConfiguredError extends Error {
  constructor() {
    super("SUPABASE_NOT_CONFIGURED");
    this.name = "SupabaseNotConfiguredError";
  }
}

export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL?.trim() && process.env.SUPABASE_SECRET_KEY?.trim());
}

export function getSupabase(): SupabaseClient {
  const url = process.env.SUPABASE_URL?.trim();
  const secretKey = process.env.SUPABASE_SECRET_KEY?.trim();

  if (!url || !secretKey) {
    throw new SupabaseNotConfiguredError();
  }

  return createClient(url, secretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
