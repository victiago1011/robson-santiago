import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resolveAdminAccess } from "@/lib/admin/guard";
import { readPanoramaData } from "@/lib/panorama/store";
import { getSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const categorySchema = z.object({
  id: z.uuid(),
  name: z.string().trim().min(2).max(70),
}).strict();
const postSchema = z.object({
  id: z.uuid(),
  category_id: z.uuid(),
  title: z.string().trim().min(5).max(240),
  summary: z.string().max(1200),
  content: z.string().trim().min(1).max(50000),
  impact: z.string().max(12000),
  source: z.string().max(1500),
  published_on: z.iso.date(),
  status: z.enum(["draft", "published"]),
  featured: z.boolean(),
}).strict();
const requestSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("category:create"), category: categorySchema }).strict(),
  z.object({ type: z.literal("category:update"), category: categorySchema }).strict(),
  z.object({ type: z.literal("category:delete"), id: z.uuid() }).strict(),
  z.object({ type: z.literal("post:upsert"), post: postSchema }).strict(),
  z.object({ type: z.literal("post:delete"), id: z.uuid() }).strict(),
  z.object({ type: z.literal("posts:create"), posts: z.array(postSchema.extend({ status: z.literal("draft") })).min(1).max(40) }).strict(),
  z.object({ type: z.literal("edition:publish"), date: z.iso.date() }).strict(),
]);

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
  const parsed = requestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Campos inválidos. Revise os títulos e textos." }, { status: 422 });
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
      ({ error } = await supabase.from("panorama_posts").upsert({
        id,
        ...fields,
        updated_at: new Date().toISOString(),
      }, { onConflict: "id" }));
    } else if (input.type === "post:delete") {
      ({ error } = await supabase.from("panorama_posts").delete().eq("id", input.id));
    } else if (input.type === "posts:create") {
      // Bulk imports can never bypass editorial review.
      ({ error } = await supabase.from("panorama_posts").insert(input.posts.map((post) => ({
        ...post,
        updated_at: new Date().toISOString(),
      }))));
    } else if (input.type === "edition:publish") {
      // One atomic PostgREST UPDATE for the draft portion of a single dated edition.
      const { data: publishedRows, error: publishError } = await supabase
        .from("panorama_posts")
        .update({ status: "published", updated_at: new Date().toISOString() })
        .eq("published_on", input.date)
        .eq("status", "draft")
        .select("id");
      if (publishError) {
        return NextResponse.json({ error: "Não foi possível publicar a edição. Tente novamente." }, { status: 503 });
      }
      return NextResponse.json({ ok: true, published: publishedRows?.length ?? 0 });
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
