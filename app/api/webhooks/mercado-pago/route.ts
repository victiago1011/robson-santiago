import { NextResponse } from "next/server";
import { handleMercadoPagoWebhook } from "@/lib/payments/handle-webhook";

export async function POST(request: Request) {
  const result = await handleMercadoPagoWebhook(request);
  return NextResponse.json(
    { ok: result.ok, ...(result.code ? { code: result.code } : {}) },
    { status: result.status },
  );
}
