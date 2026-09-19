import { assertIntegerCents } from "@/lib/commerce/money";

export function centsToDecimalString(cents: number): string {
  assertIntegerCents(cents, "amount");
  if (cents <= 0) {
    throw new Error("AMOUNT_INVALID");
  }
  return (cents / 100).toFixed(2);
}

export function centsToBrickAmount(cents: number): number {
  return Number(centsToDecimalString(cents));
}

export function decimalAmountToCents(value: string | null | undefined): number | null {
  if (typeof value !== "string") {
    return null;
  }
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(value.trim());
  if (!match) {
    return null;
  }
  const whole = match[1];
  const fraction = (match[2] ?? "").padEnd(2, "0");
  const cents = Number.parseInt(whole, 10) * 100 + Number.parseInt(fraction, 10);
  if (!Number.isSafeInteger(cents) || cents < 0) {
    return null;
  }
  return cents;
}
