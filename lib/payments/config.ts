export class MercadoPagoNotConfiguredError extends Error {
  constructor() {
    super("MERCADO_PAGO_NOT_CONFIGURED");
    this.name = "MercadoPagoNotConfiguredError";
  }
}

export function getMercadoPagoAccessToken(
  env: NodeJS.Dict<string> = process.env,
): string {
  const token = env.MERCADO_PAGO_ACCESS_TOKEN?.trim();
  if (!token) {
    throw new MercadoPagoNotConfiguredError();
  }
  return token;
}

export function getMercadoPagoWebhookSecret(
  env: NodeJS.Dict<string> = process.env,
): string | null {
  const secret = env.MERCADO_PAGO_WEBHOOK_SECRET?.trim();
  return secret ? secret : null;
}

export function getMercadoPagoPublicKey(
  env: NodeJS.Dict<string> = process.env,
): string | null {
  const key = env.NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY?.trim();
  return key ? key : null;
}
