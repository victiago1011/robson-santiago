import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resolveAdminAccess } from "@/lib/admin/guard";
import { readMarketIndicators } from "@/lib/panorama/market-store";
import { MARKET_SLUGS } from "@/lib/panorama/market";
import { getSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const editable = z.object({
  slug: z.enum(MARKET_SLUGS),
  display_value: z.string().trim().max(48),
  variation: z.string().trim().max(32),
  direction: z.enum(["up", "down", "flat"]),
  reference_on: z.iso.date().nullable(),
  visible: z.boolean(),
}).strict().refine(
  (row) => !row.visible || (row.display_value.length > 0 && row.reference_on !== null),
  "Preencha valor e data antes de publicar um indicador.",
);

const payload = z.object({ indicators: z.array(editable).length(MARKET_SLUGS.length) }).strict().refine(
  (data) => new Set(data.indicators.map((row) => row.slug)).size === MARKET_SLUGS.length,
  "Todos os indicadores precisam estar presentes uma única vez.",
);

async function checkAccess() {
  const access = await resolveAdminAccess();
  if (access.ok) return null;
  return NextResponse.json({ error: "Acesso administrativo não autorizado." }, {
    status: access.reason === "anonymous" ? 401 : access.reason === "unavailable" ? 503 : 403,
  });
}

export async function GET() {
  const denied = await checkAccess();
  if (denied) return denied;
  try {
    return NextResponse.json({ indicators: await readMarketIndicators(true) }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ error: "Não foi possível carregar os indicadores." }, { status: 503 });
  }
}

export async function PUT(request: NextRequest) {
  const denied = await checkAccess();
  if (denied) return denied;
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Origem não autorizada." }, { status: 403 });
  }
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return NextResponse.json({ error: "Conteúdo inválido." }, { status: 415 });
  }
  const raw = await request.text();
  if (raw.length > 15000) return NextResponse.json({ error: "Dados excedem o limite." }, { status: 413 });
  let parsedJson: unknown;
  try { parsedJson = JSON.parse(raw); } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }
  const result = payload.safeParse(parsedJson);
  if (!result.success) return NextResponse.json({
    error: "Preencha corretamente todos os indicadores. Para exibir, informe valor e data.",
  }, { status: 422 });

  try {
    const supabase = getSupabase();
    // Fixed labels/order are defined server-side; the browser controls only
    // the value, movement and publication toggle. One atomic upsert.
    const labels: Record<(typeof MARKET_SLUGS)[number], string> = {
      ibovespa: "Ibovespa", dolar: "Dólar", euro: "Euro", selic: "Selic",
      bitcoin: "Bitcoin", ouro: "Ouro", inflacao: "Inflação (IPCA)",
      nasdaq: "Nasdaq Composite", sp500: "S&P 500", dowjones: "Dow Jones",
    };
    const rows = result.data.indicators.map((item) => ({
      ...item,
      label: labels[item.slug],
      display_order: MARKET_SLUGS.indexOf(item.slug) + 1,
      updated_at: new Date().toISOString(),
    }));
    const { error } = await supabase.from("panorama_market_indicators").upsert(rows, { onConflict: "slug" });
    if (error) return NextResponse.json({ error: "Não foi possível salvar os indicadores." }, { status: 503 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Serviço indisponível." }, { status: 503 });
  }
}
