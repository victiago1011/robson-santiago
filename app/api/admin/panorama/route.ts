import { NextRequest, NextResponse } from "next/server";
import { resolveAdminAccess } from "@/lib/admin/guard";
import { readPanoramaData } from "@/lib/panorama/store";
import { getSupabase } from "@/lib/supabase/server";
import { describeEditorialValidation, editorialRequestSchema, resolveImpactVisibility } from "@/lib/panorama/editorial-validation";

export const dynamic = "force-dynamic";


function forbidden(access: Awaited<ReturnType<typeof resolveAdminAccess>>) {
  if (access.ok) return null;
  const code = access.reason === "anonymous" ? 401 : access.reason === "unavailable" ? 503 : 403;
  return NextResponse.json({ error: "Acesso administrativo indisponível ou não autorizado." }, { status: code });
}

export async function GET() {
  const denied = forbidden(await resolveAdminAccess());
  if (denied) return denied;
  try {
    return NextResponse.json(await readPanoramaData(true), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ error: "Não foi possível carregar o conteúdo editorial." }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  const denied = forbidden(await resolveAdminAccess());
  if (denied) return denied;

  // Session cookies must never authorize cross-origin writes.
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Origem da solicitação inválida." }, { status: 403 });
  }
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return NextResponse.json({ error: "Formato de dados inválido." }, { status: 415 });
  }
  const text = await request.text();
  if (new TextEncoder().encode(text).length > 1_200_000) {
    return NextResponse.json({ error: "Limite de tamanho excedido." }, { status: 413 });
  }
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }
  const parsed = editorialRequestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: describeEditorialValidation(parsed.error) }, { status: 422 });
  }

  const input = parsed.data;
  const supabase = getSupabase();
  try {
    let error: { code?: string; message: string } | null = null;
    if (input.type === "category:create") {
      ({ error } = await supabase.from("panorama_categories").insert(input.category));
    } else if (input.type === "category:update") {
      ({ error } = await supabase.from("panorama_categories")
        .update({ name: input.category.name, updated_at: new Date().toISOString() })
        .eq("id", input.category.id));
    } else if (input.type === "category:delete") {
      ({ error } = await supabase.from("panorama_categories").delete().eq("id", input.id));
    } else if (input.type === "post:upsert") {
      const { id, ...fields } = input.post;
      let persistedVisibility: boolean | undefined;
      if (fields.show_impact === undefined) {
        // A browser tab using the previous editor lacks this field.
        // Preserve the existing setting rather than re-enabling hidden text.
        const { data: existing, error: lookupError } = await supabase
          .from("panorama_posts")
          .select("show_impact")
          .eq("id", id)
          .maybeSingle();
        if (lookupError) return NextResponse.json({
          error: "Não foi possível verificar a preferência da notícia. Recarregue e tente novamente.",
        }, { status: 503 });
        persistedVisibility = existing?.show_impact;
      }
      ({ error } = await supabase.from("panorama_posts").upsert({
        id,
        ...fields,
        show_impact: resolveImpactVisibility(fields.show_impact, persistedVisibility, fields.impact),
        updated_at: new Date().toISOString(),
      }, { onConflict: "id" }));
    } else if (input.type === "post:delete") {
      ({ error } = await supabase.from("panorama_posts").delete().eq("id", input.id));
    } else if (input.type === "posts:create") {
      // Bulk imports can never bypass editorial review.
      ({ error } = await supabase.from("panorama_posts").insert(input.posts.map((post) => ({
        ...post,
        show_impact: resolveImpactVisibility(post.show_impact, undefined, post.impact),
        updated_at: new Date().toISOString(),
      }))));
    } else if (input.type === "edition:publish") {
      // An atomic database transaction publishes articles and the optional
      // agenda/commentary draft together; no partial edition release.
      const { data: publishedCount, error: publishError } = await supabase
        .rpc("panorama_publish_edition", { p_date: input.date });
      if (publishError) {
        return NextResponse.json({ error: "Não foi possível publicar a edição. Tente novamente." }, { status: 503 });
      }
      return NextResponse.json({ ok: true, published: Number(publishedCount ?? 0) });
    }
    if (error) {
      const status = error.code === "23505" || error.code === "23503" ? 409 : 422;
      return NextResponse.json({
        error: status === 409 ? "Conflito de categoria ou notícia vinculada. Atualize a página e confira os dados." : "Não foi possível salvar. Confira os dados e tente novamente.",
      }, { status });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Serviço indisponível. Nenhuma publicação foi confirmada." }, { status: 503 });
  }
}
