import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resolveAdminAccess } from "@/lib/admin/guard";
import { getSupabase } from "@/lib/supabase/server";
import { indicatorSlug } from "@/lib/panorama/market";

export const dynamic = "force-dynamic";

const createSchema = z.object({ name: z.string().trim().min(2).max(48) }).strict();
const renameSchema = z.object({
  slug: z.string().regex(/^[a-z][a-z0-9-]{1,47}$/),
  name: z.string().trim().min(2).max(48),
}).strict();

async function check(request: NextRequest) {
  const access = await resolveAdminAccess();
  if (!access.ok) return NextResponse.json({ error: "Acesso administrativo não autorizado." },
    { status: access.reason === "anonymous" ? 401 : access.reason === "unavailable" ? 503 : 403 });
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Origem não autorizada." }, { status: 403 });
  }
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return NextResponse.json({ error: "Formato inválido." }, { status: 415 });
  }
  return null;
}

async function body(request: NextRequest): Promise<unknown> {
  const raw = await request.text();
  if (raw.length > 2000) throw new Error("Dados muito extensos.");
  return JSON.parse(raw);
}

async function conflict(slug: string, name: string, exclude?: string) {
  const { data, error } = await getSupabase().from("panorama_market_indicators").select("slug,label");
  if (error) throw error;
  const candidate = (data || []).find((item) => item.slug !== exclude
    && (item.slug === slug || indicatorSlug(item.label) === slug ||
      item.label.trim().toLocaleLowerCase("pt-BR") === name.toLocaleLowerCase("pt-BR")));
  return candidate || null;
}

export async function POST(request: NextRequest) {
  const denied = await check(request);
  if (denied) return denied;
  let data;
  try { data = createSchema.parse(await body(request)); }
  catch { return NextResponse.json({ error: "Informe um nome entre 2 e 48 caracteres." }, { status: 422 }); }
  const slug = indicatorSlug(data.name);
  if (!/^[a-z][a-z0-9-]{1,47}$/.test(slug)) {
    return NextResponse.json({ error: "O nome precisa começar com uma letra." }, { status: 422 });
  }
  try {
    const exists = await conflict(slug, data.name);
    if (exists) return NextResponse.json({
      error: "Já existe o indicador “" + exists.label + "”. Edite o nome no card existente.",
      existing: exists.slug,
    }, { status: 409 });
    const supabase = getSupabase();
    const { data: all, error: countError } = await supabase.from("panorama_market_indicators").select("display_order");
    if (countError) throw countError;
    if ((all?.length || 0) >= 100) return NextResponse.json({ error: "Limite de 100 indicadores atingido." }, { status: 422 });
    const position = Math.max(0, ...(all || []).map((row) => row.display_order)) + 1;
    const { error } = await supabase.from("panorama_market_indicators").insert({
      slug, label: data.name, display_order: position,
    });
    if (error) {
      if (error.code === "23505") return NextResponse.json({
        error: "Já existe um indicador com esse nome. Atualize a lista e edite o indicador existente.",
      }, { status: 409 });
      throw error;
    }
    return NextResponse.json({ ok: true, slug, label: data.name }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Não foi possível cadastrar o indicador." }, { status: 503 });
  }
}

export async function PATCH(request: NextRequest) {
  const denied = await check(request);
  if (denied) return denied;
  let data;
  try { data = renameSchema.parse(await body(request)); }
  catch { return NextResponse.json({ error: "Informe indicador e nome válido." }, { status: 422 }); }
  const candidate = indicatorSlug(data.name);
  if (!candidate || !/^[a-z]/.test(candidate)) {
    return NextResponse.json({ error: "O nome precisa começar com uma letra." }, { status: 422 });
  }
  try {
    const exists = await conflict(candidate, data.name, data.slug);
    if (exists) return NextResponse.json({
      error: "Já existe o indicador “" + exists.label + "”. Escolha outro nome.",
      existing: exists.slug,
    }, { status: 409 });
    const { error } = await getSupabase().rpc("panorama_rename_market_indicator", {
      p_slug: data.slug, p_label: data.name,
    });
    if (error) {
      if (error.code === "23505") return NextResponse.json({ error: "Esse nome já está em uso." }, { status: 409 });
      throw error;
    }
    return NextResponse.json({ ok: true, slug: data.slug, label: data.name });
  } catch {
    return NextResponse.json({ error: "Não foi possível renomear o indicador." }, { status: 503 });
  }
}
