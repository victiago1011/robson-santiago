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
