export function assertIntegerCents(cents: number, label = "cents"): void {
  if (!Number.isInteger(cents)) {
    throw new Error(`${label.toUpperCase()}_NOT_INTEGER`);
  }
}

export function formatBRLFromCents(cents: number): string {
  assertIntegerCents(cents);
  const sign = cents < 0 ? "-" : "";
  const absolute = Math.abs(cents);
  const whole = Math.floor(absolute / 100);
  const fraction = String(absolute % 100).padStart(2, "0");
  return `${sign}R$ ${whole.toLocaleString("pt-BR")},${fraction}`;
}
