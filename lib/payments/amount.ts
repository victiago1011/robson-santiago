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
