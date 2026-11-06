import "server-only";

import { getSupabase } from "@/lib/supabase/server";
import type { EditionExtras } from "@/lib/panorama/edition-extras";

export async function readEditionExtras(admin: boolean): Promise<EditionExtras[]> {
  const supabase = getSupabase();
  const result: EditionExtras[] = [];
  for (let from = 0; from < 1000; from += 200) {
    let query = supabase.from("panorama_edition_extras")
      .select("published_on,agenda_items,historical_events,commentary_title,commentary_body,status");
    if (!admin) query = query.eq("status", "published");
    const { data, error } = await query.order("published_on", { ascending: false }).range(from, from + 199);
    if (error) throw error;
    result.push(...(data || []) as EditionExtras[]);
    if (!data || data.length < 200) break;
  }
  return result;
}
