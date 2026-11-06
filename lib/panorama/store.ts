import "server-only";

import { getSupabase } from "@/lib/supabase/server";

export type DbPanoramaCategory = {
  id: string;
  name: string;
};
export type DbPanoramaPost = {
  id: string;
  category_id: string;
  title: string;
  summary: string;
  content: string;
  impact: string;
  show_impact: boolean;
  source: string;
  published_on: string;
  status: "draft" | "published";
  featured: boolean;
};

export async function readPanoramaData(admin: boolean) {
  const supabase = getSupabase();
  const { data: categories, error: categoryError } = await supabase
    .from("panorama_categories")
    .select("id,name")
    .order("name", { ascending: true });
  if (categoryError) throw categoryError;

  const posts: DbPanoramaPost[] = [];
  // PostgREST limits result pages; fetch all articles rather than silently
  // hiding older news from the public date/category filters.
  for (let offset = 0; offset < 10000; offset += 500) {
    let query = supabase
      .from("panorama_posts")
      .select("id,category_id,title,summary,content,impact,show_impact,source,published_on,status,featured");
    if (!admin) query = query.eq("status", "published");
    const { data: page, error } = await query
      .order("published_on", { ascending: false })
      .order("created_at", { ascending: false })
      .range(offset, offset + 499);
    if (error) throw error;
    const current = (page || []) as DbPanoramaPost[];
    posts.push(...current);
    if (current.length < 500) break;
  }

  return {
    categories: (categories || []) as DbPanoramaCategory[],
    posts,
  };
}
