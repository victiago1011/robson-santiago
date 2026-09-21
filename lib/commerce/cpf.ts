/**
 * CPF é normalizado para 11 dígitos e persistido só nessa forma.
 * A validação exige 11 dígitos, rejeita sequências repetidas e confere os dígitos verificadores.
 */
export function normalizeCpf(value: string): string {
  return value.replace(/\D/g, "");
}

function checkDigit(digits: string, length: number): number {
  let sum = 0;
  for (let index = 0; index < length; index += 1) {
    sum += Number(digits[index]) * (length + 1 - index);
  }
  const remainder = sum % 11;
  return remainder < 2 ? 0 : 11 - remainder;
}

export function isValidCpf(value: string): boolean {
  const digits = normalizeCpf(value);
  if (!/^\d{11}$/.test(digits) || /^(\d)\1{10}$/.test(digits)) {
    return false;
  }

  return checkDigit(digits, 9) === Number(digits[9]) && checkDigit(digits, 10) === Number(digits[10]);
}
