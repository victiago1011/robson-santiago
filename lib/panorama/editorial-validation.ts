import { z } from "zod";

/** Validation lives outside the route so older-browser compatibility is regression-tested. */
export const categorySchema = z.object({
  id: z.uuid(),
  name: z.string().trim().min(2).max(70),
}).strict();

export const postSchema = z.object({
  id: z.uuid(),
  category_id: z.uuid(),
  title: z.string().trim().min(5).max(240),
  summary: z.string().max(1200),
  content: z.string().trim().min(1).max(50000),
  impact: z.string().max(12000),
  // Older clients (already open in a browser before the toggle release)
  // do not submit this property. It is resolved on the server.
  show_impact: z.boolean().optional(),
  source: z.string().max(1500),
  published_on: z.iso.date(),
  status: z.enum(["draft", "published"]),
  featured: z.boolean(),
}).strict();

export const editorialRequestSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("category:create"), category: categorySchema }).strict(),
  z.object({ type: z.literal("category:update"), category: categorySchema }).strict(),
  z.object({ type: z.literal("category:delete"), id: z.uuid() }).strict(),
  z.object({ type: z.literal("post:upsert"), post: postSchema }).strict(),
  z.object({ type: z.literal("post:delete"), id: z.uuid() }).strict(),
  z.object({ type: z.literal("posts:create"), posts: z.array(postSchema.extend({ status: z.literal("draft") })).min(1).max(40) }).strict(),
  z.object({ type: z.literal("edition:publish"), date: z.iso.date() }).strict(),
]);

/**
 * Keep explicit editor choices, including hidden context, when a tab with
 * older JavaScript saves a news item without the newly added flag.
 */
export function resolveImpactVisibility(
  submitted: boolean | undefined,
  persisted: boolean | undefined,
  impact: string,
): boolean {
  return submitted ?? persisted ?? impact.trim().length > 0;
}

const labels: Record<string, string> = {
  id: "identificador",
  category_id: "categoria",
  title: "título",
  summary: "resumo",
  content: "texto completo",
  impact: "Por que importa?",
  show_impact: "exibição de Por que importa?",
  source: "fonte",
  published_on: "data de publicação",
  status: "status",
  featured: "destaque de 60 segundos",
  posts: "notícias",
  type: "operação",
  name: "categoria",
  date: "data da edição",
};

export function describeEditorialValidation(error: z.ZodError): string {
  const fields = [...new Set(error.issues.map((issue) => {
    const key = String(issue.path[issue.path.length - 1] ?? "");
    return labels[key] ?? (issue.path.includes("posts") ? "notícias" : "dados enviados");
  }))].slice(0, 3);
  return "Confira os campos: " + fields.join(", ") + ". Recarregue o ADM se a página estiver aberta desde uma atualização.";
}
