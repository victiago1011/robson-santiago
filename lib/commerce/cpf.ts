/**
 * CPF é normalizado para 11 dígitos e persistido só nessa forma.
 * A validação exige 11 dígitos, rejeita sequências repetidas e confere os dígitos verificadores.
 */
export function normalizeCpf(value: string): string {
  return value.replace(/\D/g, "");
}

export function formatCpf(value: string): string {
  const digits = normalizeCpf(value).slice(0, 11);
  const part1 = digits.slice(0, 3);
  const part2 = digits.slice(3, 6);
  const part3 = digits.slice(6, 9);
  const part4 = digits.slice(9, 11);
  if (digits.length <= 3) {
    return part1;
  }
  if (digits.length <= 6) {
    return `${part1}.${part2}`;
  }
  if (digits.length <= 9) {
    return `${part1}.${part2}.${part3}`;
  }
  return `${part1}.${part2}.${part3}-${part4}`;
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
