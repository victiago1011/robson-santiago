import { NextResponse } from "next/server";
import { getPublicPaymentStatus } from "@/lib/payments/public-payment-status";
import { findOrderByPublicId } from "@/lib/payments/store";
import { SupabaseNotConfiguredError } from "@/lib/supabase/server";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ publicId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  let publicId: string | undefined;
  try {
    const params = await context.params;
    publicId = params.publicId;
  } catch {
    return NextResponse.json({ ok: false, code: "VALIDATION_ERROR" }, { status: 400 });
  }

  try {
    const result = await getPublicPaymentStatus(publicId ?? "", {
      findOrderByPublicId,
    });
    if (!result.ok) {
      return NextResponse.json({ ok: false, code: result.code }, { status: result.status });
    }
    return NextResponse.json({ ok: true, status: result.status });
  } catch (error) {
    if (error instanceof SupabaseNotConfiguredError) {
      return NextResponse.json({ ok: false, code: "SUPABASE_NOT_CONFIGURED" }, { status: 503 });
    }
    return NextResponse.json({ ok: false, code: "STATUS_UNAVAILABLE" }, { status: 503 });
  }
}
