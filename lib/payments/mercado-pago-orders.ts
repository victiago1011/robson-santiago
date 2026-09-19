import "server-only";

import { MercadoPagoConfig, Order } from "mercadopago";
import { getMercadoPagoAccessToken, resolveOrderPayerFirstName } from "@/lib/payments/config";
import type {
  CreateMercadoPagoOrderInput,
  MercadoPagoOrder,
  MercadoPagoOrdersGateway,
} from "@/lib/payments/types";

export type { MercadoPagoOrdersGateway };

function buildCreateBody(input: CreateMercadoPagoOrderInput, accessToken: string) {
  const payment =
    input.payment.method === "pix"
      ? {
          amount: input.totalAmount,
          expiration_time: "P1D",
          payment_method: {
            id: "pix",
            type: "bank_transfer",
          },
        }
      : {
          amount: input.totalAmount,
          payment_method: {
            id: input.payment.paymentMethodId,
            type: "credit_card",
            token: input.payment.token,
            installments: input.payment.installments,
            ...(input.payment.issuerId ? { issuer_id: input.payment.issuerId } : {}),
          },
        };

  return {
    type: "online",
    processing_mode: "automatic",
    total_amount: input.totalAmount,
    external_reference: input.externalReference,
    description: input.description,
    payer: {
      email: input.payer.email,
      first_name: resolveOrderPayerFirstName({
        method: input.payment.method,
        firstName: input.payer.firstName,
        accessToken,
      }),
      last_name: input.payer.lastName,
      identification: {
        type: "CPF",
        number: input.payer.identificationNumber,
      },
    },
    ...(input.shipping
      ? {
          shipment: {
            address: {
              zip_code: input.shipping.zip,
              street_name: input.shipping.street,
              street_number: input.shipping.number,
              neighborhood: input.shipping.district,
              city: input.shipping.city,
              state: input.shipping.state,
              complement: input.shipping.complement ?? "",
            },
          },
        }
      : {}),
    transactions: {
      payments: [payment],
    },
  };
}

export function createMercadoPagoOrdersGateway(
  env: NodeJS.Dict<string> = process.env,
): MercadoPagoOrdersGateway {
  const accessToken = getMercadoPagoAccessToken(env);
  const client = new MercadoPagoConfig({
    accessToken,
    options: { timeout: 10000 },
  });
  const orders = new Order(client);

  return {
    async createOrder(input, idempotencyKey) {
      const created = await orders.create({
        body: buildCreateBody(input, accessToken),
        requestOptions: { idempotencyKey },
      });
      return created as MercadoPagoOrder;
    },
    async getOrder(id) {
      const found = await orders.get({ id });
      return found as MercadoPagoOrder;
    },
  };
}
