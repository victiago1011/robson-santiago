import { z } from "zod";
import { BRAZILIAN_STATES } from "@/lib/commerce/address";
import { isBasicCpfFormat, normalizeCpf } from "@/lib/commerce/cpf";
import { PHYSICAL_BOOK } from "@/lib/commerce/product";

const trimmed = (max: number) => z.string().trim().min(1).max(max);

export const customerSchema = z.object({
  name: trimmed(120),
  email: z.email().trim().max(254),
  phone: trimmed(20),
  document: z
    .string()
    .trim()
    .min(1)
    .max(20)
    .refine(isBasicCpfFormat, "CPF_INVALID")
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
  complement: z.string().trim().max(80).optional(),
  district: trimmed(80),
  city: trimmed(80),
  state: z.enum(BRAZILIAN_STATES),
});

export const orderItemSchema = z.object({
  sku: z.literal(PHYSICAL_BOOK.sku),
  quantity: z.number().int().min(PHYSICAL_BOOK.minQuantity).max(PHYSICAL_BOOK.maxQuantity),
});

export const createOrderSchema = z
  .object({
    sku: z.literal(PHYSICAL_BOOK.sku),
    quantity: z.number().int().min(PHYSICAL_BOOK.minQuantity).max(PHYSICAL_BOOK.maxQuantity),
    customer: customerSchema,
    shipping: shippingAddressSchema,
  })
  .strict();

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
