import "server-only";

import { EBOOK_STORAGE_BUCKET, isSafeEbookObjectPath } from "@/lib/digital-delivery/download-policy";
import { getSupabase } from "@/lib/supabase/server";
import type { FetchEbookObjectResult } from "@/lib/digital-delivery/download";

export async function fetchEbookObjectFromStorage(
  objectPath: string,
): Promise<FetchEbookObjectResult> {
  if (!isSafeEbookObjectPath(objectPath)) {
    return { ok: false };
  }

  const supabase = getSupabase();
  const { data, error } = await supabase.storage.from(EBOOK_STORAGE_BUCKET).download(objectPath.trim());
  if (error || !data) {
    return { ok: false };
  }

  const bytes = new Uint8Array(await data.arrayBuffer());
  return { ok: true, body: bytes };
}
