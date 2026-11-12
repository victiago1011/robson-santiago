import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resolveAdminAccess } from "@/lib/admin/guard";
import { getSupabase } from "@/lib/supabase/server";
import { parsePanoramaEdition } from "@/lib/panorama/plain-edition";
import { readTextEditions } from "@/lib/panorama/plain-edition-store";

export const dynamic = "force-dynamic";

const inputSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("save"), date: z.iso.date(), text: z.string().min(1).max(100000) }).strict(),
  z.object({ action: z.literal("publish"), date: z.iso.date() }).strict(),
  z.object({ action: z.literal("unpublish"), date: z.iso.date() }).strict(),
]);

async function denied() {
  const access = await resolveAdminAccess();
  return access.ok ? null : NextResponse.json({ error: "Acesso administrativo não autorizado." },
    { status: access.reason === "anonymous" ? 401 : access.reason === "unavailable" ? 503 : 403 });
}

export async function GET() {
  const block = await denied();
  if (block) return block;
  try {
    return NextResponse.json({ editions: await readTextEditions() }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch {
    return NextResponse.json({ error: "Não foi possível carregar as edições." }, { status: 503 });
  }
}

export async function PUT(request: NextRequest) {
  const block = await denied();
  if (block) return block;
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin)
    return NextResponse.json({ error: "Origem inválida." }, { status: 403 });
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return NextResponse.json({ error: "Formato inválido." }, { status: 415 });
  const body = await request.text();
  if (new TextEncoder().encode(body).byteLength > 150000)
    return NextResponse.json({ error: "Texto muito grande." }, { status: 413 });
  let value: unknown;
  try { value = JSON.parse(body); } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }
  const parsed = inputSchema.safeParse(value);
  if (!parsed.success) return NextResponse.json({ error: "Confira a data e o texto." }, { status: 422 });

  const input = parsed.data;
  const supabase = getSupabase();
  try {
    const { data: current, error: lookupError } = await supabase
      .from("panorama_text_editions")
      .select("published_on,draft_text")
      .eq("published_on", input.date).maybeSingle();
    if (lookupError) throw lookupError;

    if (input.action === "save") {
      if (new TextEncoder().encode(input.text).byteLength > 120000)
        return NextResponse.json({ error: "O texto ultrapassa 120 KB." }, { status: 413 });
      const normalized = input.text.replace(/\r\n?/g, "\n").trim();
      const detected = parsePanoramaEdition(normalized).date;
      if (detected && detected !== input.date)
        return NextResponse.json({ error: "A data identificada no texto é " + detected + ". Selecione essa data antes de salvar." }, { status: 422 });
      const query = current
        ? supabase.from("panorama_text_editions").update({ draft_text: normalized, updated_at: new Date().toISOString() }).eq("published_on", input.date)
        : supabase.from("panorama_text_editions").insert({ published_on: input.date, draft_text: normalized });
      const { error } = await query;
      if (error) throw error;
      return NextResponse.json({ ok: true, status: "draft" });
    }

    if (!current) return NextResponse.json({ error: "Nenhum rascunho foi encontrado para essa data." }, { status: 404 });

    if (input.action === "unpublish") {
      const { error } = await supabase.from("panorama_text_editions")
        .update({ published_text: null, published_at: null, updated_at: new Date().toISOString() })
        .eq("published_on", input.date);
      if (error) throw error;
      return NextResponse.json({ ok: true, status: "draft" });
    }

    const text = String(current.draft_text || "");
    const edition = parsePanoramaEdition(text);
    if (edition.date && edition.date !== input.date)
      return NextResponse.json({ error: "A data indicada no texto não corresponde à edição selecionada." }, { status: 422 });
    if (!edition.news.length || text.length < 100)
      return NextResponse.json({ error: "A edição precisa conter notícias numeradas e texto suficiente para publicação." }, { status: 422 });
    const { error } = await supabase.from("panorama_text_editions")
      .update({ published_text: text, published_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("published_on", input.date);
    if (error) throw error;
    return NextResponse.json({ ok: true, status: "published" });
  } catch {
    return NextResponse.json({ error: "Não foi possível salvar ou publicar. Tente novamente." }, { status: 503 });
  }
}
