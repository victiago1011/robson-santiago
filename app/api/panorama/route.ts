import { NextResponse } from "next/server";
import { readPanoramaData } from "@/lib/panorama/store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await readPanoramaData(false);
    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      { error: "Não foi possível carregar as notícias. Tente novamente." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
