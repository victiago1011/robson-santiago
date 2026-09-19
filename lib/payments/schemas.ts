import { z } from "zod";
import { customerSchema, shippingAddressSchema } from "@/lib/commerce/schemas";
import { PHYSICAL_QUANTITY } from "@/lib/commerce/selection";

const uuid = z.uuid();

const pixPaymentSchema = z
  .object({
    method: z.literal("pix"),
  })
  .strict();

const creditCardPaymentSchema = z
  .object({
    method: z.literal("credit_card"),
    token: z.string().trim().min(1).max(256),
    paymentMethodId: z.string().trim().min(1).max(40),
    installments: z.number().int().min(1).max(24),
    issuerId: z.string().trim().min(1).max(40).optional(),
  })
  .strict();

export const checkoutPaymentMethodSchema = z.discriminatedUnion("method", [
  pixPaymentSchema,
  creditCardPaymentSchema,
]);

const paymentEnvelope = {
  paymentAttemptId: uuid,
  payment: checkoutPaymentMethodSchema,
};

export const checkoutPaySchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("physical"),
      quantity: z.number().int().min(PHYSICAL_QUANTITY.min).max(PHYSICAL_QUANTITY.max),
      ebookBump: z.boolean(),
      customer: customerSchema,
      shipping: shippingAddressSchema,
      ...paymentEnvelope,
    })
    .strict(),
  z
    .object({
      kind: z.literal("digital"),
      customer: customerSchema,
      ...paymentEnvelope,
    })
    .strict(),
]);

export type CheckoutPaymentMethod = z.infer<typeof checkoutPaymentMethodSchema>;
export type CheckoutPayInput = z.infer<typeof checkoutPaySchema>;
