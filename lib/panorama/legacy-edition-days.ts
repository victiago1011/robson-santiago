import "server-only";
import { getSupabase } from "@/lib/supabase/server";

/**
 * Old editions were saved as separate news posts, market snapshots and
 * optional extra sections. They must remain administrable even though
 * the current editor stores a single integral TXT.
 */
export async function readLegacyEditionDays(): Promise<string[]> {
  const supabase = getSupabase();
  const [posts, market, extras] = await Promise.all([
    supabase.from("panorama_posts").select("published_on")
      .order("published_on", { ascending: false }).limit(5000),
    supabase.from("panorama_market_snapshots").select("edition_on")
      .order("edition_on", { ascending: false }).limit(5000),
    supabase.from("panorama_edition_extras").select("published_on")
      .order("published_on", { ascending: false }).limit(5000),
  ]);
  if (posts.error || market.error || extras.error)
    throw posts.error || market.error || extras.error;
  return Array.from(new Set([
    ...(posts.data || []).map((row) => row.published_on),
    ...(market.data || []).map((row) => row.edition_on),
    ...(extras.data || []).map((row) => row.published_on),
  ])).sort((a, b) => b.localeCompare(a));
}
