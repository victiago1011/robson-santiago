const SENSITIVE_KEY =
  /token|cvv|cvc|pan|cardnumber|card_number|securitycode|access_token|secret|authorization|password|document|cpf|address|street|zip|complement|email|phone/i;

export function containsSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY.test(key);
}

export function assertNoSensitiveFields(
  payload: unknown,
  path = "",
): void {
  if (payload === null || payload === undefined) {
    return;
  }

  if (Array.isArray(payload)) {
    payload.forEach((item, index) => assertNoSensitiveFields(item, `${path}[${index}]`));
    return;
  }

  if (typeof payload !== "object") {
    return;
  }

  for (const [key, value] of Object.entries(payload as Record<string, unknown>)) {
    if (containsSensitiveKey(key)) {
      throw new Error(`SENSITIVE_FIELD:${path}${key}`);
    }
    assertNoSensitiveFields(value, `${path}${key}.`);
  }
}
