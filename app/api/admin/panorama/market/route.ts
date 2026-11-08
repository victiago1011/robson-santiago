import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resolveAdminAccess } from "@/lib/admin/guard";
import { readMarketIndicators, readMarketSnapshots } from "@/lib/panorama/market-store";

import { getSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const editable = z.object({
  slug: z.string().regex(/^[a-z][a-z0-9-]{1,47}$/),
  display_value: z.string().trim().max(48),
  variation: z.string().trim().max(32),
  direction: z.enum(["up", "down", "flat"]),
  reference_on: z.iso.date().nullable(),
  visible: z.boolean(),
}).strict().refine(
  (row) => !row.visible || (row.display_value.length > 0 && row.reference_on !== null),
  "Preencha valor e data antes de publicar um indicador.",
);

const payload = z.object({ edition_on: z.iso.date(), indicators: z.array(editable).min(1).max(100) }).strict().refine(
  (data) => new Set(data.indicators.map((row) => row.slug)).size === data.indicators.length,
  "Indicadores duplicados no envio.",
);

async function checkAccess() {
  const access = await resolveAdminAccess();
  if (access.ok) return null;
  return NextResponse.json({ error: "Acesso administrativo não autorizado." }, {
    status: access.reason === "anonymous" ? 401 : access.reason === "unavailable" ? 503 : 403,
  });
}

export async function GET(request: NextRequest) {
  const denied = await checkAccess();
  if (denied) return denied;
  try {
    const date = new URL(request.url).searchParams.get("date");
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: "Data inválida." }, { status: 400 });
    }
    const [allLabels, historical] = await Promise.all([
      readMarketIndicators(true), readMarketSnapshots(true),
    ]);
    const entries = date ? historical.filter((row) => row.edition_on === date) : [];
    const bySlug = new Map(entries.map((row) => [row.slug, row]));
    const indicators = allLabels.map((item) => {
      const saved = bySlug.get(item.slug);
      return saved ?? {
        ...item, display_value: "", variation: "", direction: "flat" as const,
        reference_on: null, visible: false,
      };
    });
    return NextResponse.json({ indicators, edition_on: date }, {
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
    const { data: catalog, error: catalogError } = await supabase.from("panorama_market_indicators")
      .select("slug,label,display_order");
    if (catalogError || !catalog) throw catalogError || new Error("Catálogo indisponível");
    const catalogBySlug = new Map(catalog.map((row) => [row.slug, row]));
    if (result.data.indicators.some((item) => !catalogBySlug.has(item.slug))) {
      return NextResponse.json({ error: "Indicador não encontrado. Atualize a página." }, { status: 422 });
    }
    const rows = result.data.indicators.map((item) => ({
      edition_on: result.data.edition_on,
      ...item,
      label: catalogBySlug.get(item.slug)!.label,
      display_order: catalogBySlug.get(item.slug)!.display_order,
      updated_at: new Date().toISOString(),
    }));
    const { error } = await supabase.from("panorama_market_snapshots").upsert(rows, { onConflict: "edition_on,slug" });
    if (error) return NextResponse.json({ error: "Não foi possível salvar os indicadores." }, { status: 503 });
    return NextResponse.json({ ok: true, edition_on: result.data.edition_on });
  } catch {
    return NextResponse.json({ error: "Serviço indisponível." }, { status: 503 });
  }
}
