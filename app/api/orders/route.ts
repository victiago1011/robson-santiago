import { NextResponse } from "next/server";
import { createOrder, parseCreateOrderInput } from "@/lib/commerce/create-order";

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, code: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }

  const parsed = parseCreateOrderInput(payload);
  if (!parsed.ok) {
    return NextResponse.json(
      { ok: false, code: parsed.code },
      { status: parsed.status },
    );
  }

  const result = await createOrder(parsed.data);

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, code: result.code },
      { status: result.status },
    );
  }

  return NextResponse.json({ ok: true, publicId: result.publicId }, { status: 201 });
}
