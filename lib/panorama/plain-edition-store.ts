import "server-only";
import { getSupabase } from "@/lib/supabase/server";

export type TextEdition = {
  published_on: string;
  draft_text: string;
  published_text: string | null;
  published_at: string | null;
};

export type PublicTextEdition = Pick<TextEdition, "published_on" | "published_text" | "published_at">;

export async function readTextEditions(): Promise<TextEdition[]> {
  const response = await getSupabase().from("panorama_text_editions")
    .select("published_on,draft_text,published_text,published_at")
    .order("published_on", { ascending: false }).limit(500);
  if (response.error) throw response.error;
  return (response.data || []) as TextEdition[];
}

export async function readPublicTextEditions(): Promise<PublicTextEdition[]> {
  const response = await getSupabase().from("panorama_text_editions")
    .select("published_on,published_text,published_at")
    .not("published_text", "is", null)
    .order("published_on", { ascending: false }).limit(500);
  if (response.error) throw response.error;
  return (response.data || []) as PublicTextEdition[];
}
