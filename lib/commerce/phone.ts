/**
 * WhatsApp brasileiro canônico: 11 dígitos, DDD + celular começando com 9.
 * O +55 é só apresentação. Código 55 seguido de exatamente 11 dígitos é removido.
 */
export function normalizeBrazilianPhone(value: string): string {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("55") && digits.length === 13) {
    digits = digits.slice(2);
  }
  return digits;
}

export function isValidBrazilianPhone(value: string): boolean {
  return /^\d{2}9\d{8}$/.test(normalizeBrazilianPhone(value));
}

export function maskBrazilianPhoneInput(value: string): string {
  const digits = normalizeBrazilianPhone(value).slice(0, 11);
  if (digits.length === 0) {
    return "";
  }
  if (digits.length <= 2) {
    return `(${digits}`;
  }

  const ddd = digits.slice(0, 2);
  const subscriber = digits.slice(2);
  const first = subscriber.slice(0, 5);
  const second = subscriber.slice(5);
  if (!second) {
    return `(${ddd}) ${first}`;
  }
  return `(${ddd}) ${first}-${second}`;
}

export function formatBrazilianPhone(value: string): string {
  const digits = normalizeBrazilianPhone(value);
  if (!isValidBrazilianPhone(digits)) {
    return maskBrazilianPhoneInput(value);
  }
  const ddd = digits.slice(0, 2);
  const subscriber = digits.slice(2);
  return `+55 (${ddd}) ${subscriber.slice(0, 5)}-${subscriber.slice(5)}`;
}
