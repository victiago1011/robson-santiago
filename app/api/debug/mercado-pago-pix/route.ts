import { NextResponse } from "next/server";
import { assertNoSensitiveFields } from "@/lib/payments/sanitize";
import { runOfficialPixDiagnostic } from "@/lib/payments/debug-pix-official-test";

export const maxDuration = 30;

export async function POST(request: Request) {
  const result = await runOfficialPixDiagnostic(request, process.env);
  assertNoSensitiveFields(result.body);
  return NextResponse.json(result.body, { status: result.status });
}
