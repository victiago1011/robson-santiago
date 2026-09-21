import type { PurchaseKind } from "@/lib/commerce/selection";
import { customerSchema, shippingAddressSchema } from "@/lib/commerce/schemas";

export const CHECKOUT_FIELD_ORDER = [
  "customer_name",
  "customer_email",
  "customer_phone",
  "customer_document",
  "shipping_zip",
  "shipping_street",
  "shipping_number",
  "shipping_district",
  "shipping_city",
  "shipping_state",
] as const;

export type CheckoutFieldId = (typeof CHECKOUT_FIELD_ORDER)[number];

export type CheckoutFieldErrors = Partial<Record<CheckoutFieldId, string>>;

export type CheckoutCustomerInput = {
  name: string;
  email: string;
  phone: string;
  document: string;
};

export type CheckoutShippingInput = {
  zip: string;
  street: string;
  number: string;
  complement?: string;
  district: string;
  city: string;
  state: string;
};

const CUSTOMER_FIELD_IDS: Record<string, CheckoutFieldId> = {
  name: "customer_name",
  email: "customer_email",
  phone: "customer_phone",
  document: "customer_document",
};

const SHIPPING_FIELD_IDS: Record<string, CheckoutFieldId> = {
  zip: "shipping_zip",
  street: "shipping_street",
  number: "shipping_number",
  district: "shipping_district",
  city: "shipping_city",
  state: "shipping_state",
};

const EMPTY_SHIPPING: CheckoutShippingInput = {
  zip: "",
  street: "",
  number: "",
  district: "",
  city: "",
  state: "",
};

type SchemaIssue = {
  code?: string;
  maximum?: unknown;
  path?: ReadonlyArray<PropertyKey>;
};

function messageFor(field: CheckoutFieldId, issue: SchemaIssue): string {
  const maxLengthField =
    field !== "customer_document" && field !== "shipping_zip" && field !== "shipping_state";
  if (issue.code === "too_big" && maxLengthField && typeof issue.maximum === "number") {
    return `Use no máximo ${issue.maximum} caracteres.`;
  }

  switch (field) {
    case "customer_name":
      return "Informe seu nome completo.";
    case "customer_email":
      return "Informe um e-mail válido.";
    case "customer_phone":
      return "Informe seu WhatsApp.";
    case "customer_document":
      return "Informe um CPF válido.";
    case "shipping_zip":
      return issue.code === "too_small" ? "Informe o CEP." : "Informe um CEP válido.";
    case "shipping_street":
      return "Informe a rua.";
    case "shipping_number":
      return "Informe o número.";
    case "shipping_district":
      return "Informe o bairro.";
    case "shipping_city":
      return "Informe a cidade.";
    case "shipping_state":
      return "Selecione o estado.";
    default:
      return "Revise este campo.";
  }
}

function assignIssues(
  errors: CheckoutFieldErrors,
  issues: readonly SchemaIssue[],
  fieldIds: Record<string, CheckoutFieldId>,
) {
  for (const issue of issues) {
    const key = String(issue.path?.[0] ?? "");
    const fieldId = fieldIds[key];
    if (!fieldId || errors[fieldId]) {
      continue;
    }
    errors[fieldId] = messageFor(fieldId, issue);
  }
}

export function checkoutFieldErrors(input: {
  kind: PurchaseKind;
  ebookBump?: boolean;
  customer: CheckoutCustomerInput;
  shipping?: CheckoutShippingInput;
}): CheckoutFieldErrors {
  void input.ebookBump;

  const errors: CheckoutFieldErrors = {};
  const customer = customerSchema.safeParse(input.customer);
  if (!customer.success) {
    assignIssues(errors, customer.error.issues, CUSTOMER_FIELD_IDS);
  }

  if (input.kind === "physical") {
    const shipping = shippingAddressSchema.safeParse(input.shipping ?? EMPTY_SHIPPING);
    if (!shipping.success) {
      assignIssues(errors, shipping.error.issues, SHIPPING_FIELD_IDS);
    }
  }

  return errors;
}

export function firstInvalidCheckoutField(errors: CheckoutFieldErrors): CheckoutFieldId | null {
  for (const id of CHECKOUT_FIELD_ORDER) {
    if (errors[id]) {
      return id;
    }
  }
  return null;
}
