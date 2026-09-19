import { NextResponse } from "next/server";
import { calculateOrderQuote } from "@/lib/commerce/calculate-order-quote";
import { toPublicQuote, QuoteSelectionError } from "@/lib/commerce/quote";
import { purchaseSelectionSchema } from "@/lib/commerce/schemas";
import { SupabaseNotConfiguredError } from "@/lib/supabase/server";

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, code: "VALIDATION_ERROR" }, { status: 400 });
  }

  const parsed = purchaseSelectionSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, code: "VALIDATION_ERROR" }, { status: 400 });
  }

  try {
    const quote = await calculateOrderQuote(parsed.data);
    return NextResponse.json({ ok: true, quote: toPublicQuote(quote) });
  } catch (error) {
    if (error instanceof QuoteSelectionError) {
      return NextResponse.json(
        { ok: false, code: error.code === "INVALID_QUANTITY" ? "VALIDATION_ERROR" : "CATALOG_UNAVAILABLE" },
        { status: error.code === "INVALID_QUANTITY" ? 400 : 503 },
      );
    }

    if (error instanceof SupabaseNotConfiguredError) {
      return NextResponse.json({ ok: false, code: "SUPABASE_NOT_CONFIGURED" }, { status: 503 });
    }

    return NextResponse.json({ ok: false, code: "CATALOG_UNAVAILABLE" }, { status: 503 });
  }
}
