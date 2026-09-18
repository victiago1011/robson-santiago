/**
 * CPF é normalizado para 11 dígitos e persistido só nessa forma.
 * Nesta fase validamos comprimento, não o dígito verificador.
 */
export function normalizeCpf(value: string): string {
  return value.replace(/\D/g, "");
}

export function isBasicCpfFormat(value: string): boolean {
  const digits = normalizeCpf(value);
  return digits.length === 11;
}
