import { z } from "zod";
import { BRAZILIAN_STATES } from "./address";
import { isValidCpf, normalizeCpf } from "./cpf";
import { isValidBrazilianPhone, normalizeBrazilianPhone } from "./phone";
import { PHYSICAL_QUANTITY } from "./selection";

const trimmed = (max: number) => z.string().trim().min(1).max(max);

export const SHIPPING_COMPLEMENT_MAX_LENGTH = 20;

export const customerSchema = z.object({
  name: trimmed(120),
  email: z.email().trim().max(254),
  phone: z
    .string()
    .trim()
    .refine(isValidBrazilianPhone, "PHONE_INVALID")
    .transform(normalizeBrazilianPhone),
  document: z
    .string()
    .trim()
    .min(1)
    .max(20)
    .refine(isValidCpf, "CPF_INVALID")
    .transform(normalizeCpf),
});

export const shippingAddressSchema = z.object({
  zip: z
    .string()
    .trim()
    .min(1)
    .max(9)
    .transform((value) => value.replace(/\D/g, ""))
    .refine((value) => value.length === 8, "ZIP_INVALID"),
  street: trimmed(160),
  number: trimmed(20),
  complement: z.string().trim().max(SHIPPING_COMPLEMENT_MAX_LENGTH).optional(),
  district: trimmed(80),
  city: trimmed(80),
  state: z.enum(BRAZILIAN_STATES),
});

const physicalSelectionSchema = z
  .object({
    kind: z.literal("physical"),
    quantity: z.number().int().min(PHYSICAL_QUANTITY.min).max(PHYSICAL_QUANTITY.max),
    ebookBump: z.boolean(),
  })
  .strict();

const digitalSelectionSchema = z
  .object({
    kind: z.literal("digital"),
  })
  .strict();

export const purchaseSelectionSchema = z.discriminatedUnion("kind", [
  physicalSelectionSchema,
  digitalSelectionSchema,
]);

export const createOrderSchema = z.discriminatedUnion("kind", [
  physicalSelectionSchema.extend({
    customer: customerSchema,
    shipping: shippingAddressSchema,
  }).strict(),
  digitalSelectionSchema.extend({
    customer: customerSchema,
  }).strict(),
]);

export type PurchaseSelectionInput = z.infer<typeof purchaseSelectionSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
