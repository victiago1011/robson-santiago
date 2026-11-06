import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resolveAdminAccess } from "@/lib/admin/guard";
import { readEditionExtras } from "@/lib/panorama/edition-store";
import { getSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const agendaItemSchema = z.object({
  text: z.string().trim().min(1).max(500),
  on: z.iso.date().nullable(),
}).strict();
const editionSchema = z.object({
  published_on: z.iso.date(),
  agenda_items: z.array(agendaItemSchema).max(30),
  commentary_title: z.string().trim().max(240),
  commentary_body: z.string().trim().max(30000),
}).strict();

async function denied() {
  const access = await resolveAdminAccess();
  if (access.ok) return null;
  return NextResponse.json({ error: "Acesso administrativo não autorizado." },
    { status: access.reason === "anonymous" ? 401 : access.reason === "unavailable" ? 503 : 403 });
}

export async function GET() {
  const forbidden = await denied();
  if (forbidden) return forbidden;
  try {
    return NextResponse.json({ editions: await readEditionExtras(true) },
      { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Não foi possível carregar as edições." }, { status: 503 });
  }
}

export async function PUT(request: NextRequest) {
  const forbidden = await denied();
  if (forbidden) return forbidden;
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Origem inválida." }, { status: 403 });
  }
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return NextResponse.json({ error: "Envie dados JSON." }, { status: 415 });
  }
  const raw = await request.text();
  if (new TextEncoder().encode(raw).length > 48_000) {
    return NextResponse.json({ error: "Texto acima do limite permitido." }, { status: 413 });
  }
  let input: unknown;
  try { input = JSON.parse(raw); } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }
  const parsed = editionSchema.safeParse(input);
  if (!parsed.success) return NextResponse.json({
    error: "Revise a agenda, a data e o texto do comentarista (máx. 30 mil caracteres).",
  }, { status: 422 });

  try {
    // Always draft on edit. Publication only via the explicit edition approval,
    // so a saved opinion is never accidentally made public.
    const { error } = await getSupabase().from("panorama_edition_extras").upsert({
      ...parsed.data,
      status: "draft",
      updated_at: new Date().toISOString(),
    }, { onConflict: "published_on" });
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Não foi possível salvar a agenda e a análise." }, { status: 503 });
  }
}
