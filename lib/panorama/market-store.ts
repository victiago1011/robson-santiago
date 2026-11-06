import "server-only";

import { getSupabase } from "@/lib/supabase/server";
import type { MarketIndicator } from "@/lib/panorama/market";

export async function readMarketIndicators(admin: boolean): Promise<MarketIndicator[]> {
  let query = getSupabase()
    .from("panorama_market_indicators")
    .select("slug,label,display_value,variation,direction,reference_on,visible,display_order");
  if (!admin) query = query.eq("visible", true);
  const { data, error } = await query.order("display_order", { ascending: true });
  if (error) throw error;
  return (data || []) as MarketIndicator[];
}

export type MarketSnapshot = MarketIndicator & { edition_on: string };

export async function readMarketSnapshots(admin: boolean): Promise<MarketSnapshot[]> {
  const result: MarketSnapshot[] = [];
  for (let offset = 0; offset < 3000; offset += 300) {
    let query = getSupabase().from("panorama_market_snapshots")
      .select("edition_on,slug,label,display_value,variation,direction,reference_on,visible,display_order");
    if (!admin) query = query.eq("visible", true);
    const { data, error } = await query.order("edition_on", { ascending: false })
      .order("display_order", { ascending: true }).range(offset, offset + 299);
    if (error) throw error;
    result.push(...(data || []) as MarketSnapshot[]);
    if (!data || data.length < 300) break;
  }
  return result;
}
