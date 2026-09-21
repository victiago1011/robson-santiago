import { NextResponse } from "next/server";
import { ebookDownloadToResponse, handleEbookDownload } from "@/lib/digital-delivery/download";
import { fetchEbookObjectFromStorage } from "@/lib/digital-delivery/storage";
import { supabaseDigitalDeliveryStore } from "@/lib/digital-delivery/store";
import { SupabaseNotConfiguredError } from "@/lib/supabase/server";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ token: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  let token: string | undefined;
  try {
    const params = await context.params;
    token = params.token;
  } catch {
    return NextResponse.json({ ok: false, code: "NOT_FOUND" }, { status: 404 });
  }

  try {
    const result = await handleEbookDownload(token, {
      store: supabaseDigitalDeliveryStore,
      fetchEbookObject: fetchEbookObjectFromStorage,
    });
    return ebookDownloadToResponse(result);
  } catch (error) {
    if (error instanceof SupabaseNotConfiguredError) {
      return NextResponse.json({ ok: false, code: "UNAVAILABLE" }, { status: 503 });
    }
    console.error("ebook_download_failed", { code: "UNAVAILABLE" });
    return NextResponse.json({ ok: false, code: "UNAVAILABLE" }, { status: 503 });
  }
}
