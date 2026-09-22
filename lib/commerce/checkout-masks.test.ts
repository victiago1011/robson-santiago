import assert from "node:assert/strict";
import { test } from "node:test";
import { formatCep, normalizeCep } from "@/lib/commerce/cep";
import { formatCpf, normalizeCpf } from "@/lib/commerce/cpf";
import {
  formatBrazilianPhone,
  maskBrazilianPhoneInput,
  normalizeBrazilianPhone,
} from "@/lib/commerce/phone";
import { customerSchema, shippingAddressSchema } from "@/lib/commerce/schemas";
import { checkoutPaySchema } from "@/lib/payments/schemas";

const customer = {
  name: "Maria Silva",
  email: "maria@example.com",
  phone: "48999999999",
  document: "52998224725",
};

test("WhatsApp normaliza colagem para 11 dígitos", () => {
  assert.equal(normalizeBrazilianPhone("48999999999"), "48999999999");
  assert.equal(normalizeBrazilianPhone("(48) 99999-9999"), "48999999999");
  assert.equal(normalizeBrazilianPhone("+55 48 99999-9999"), "48999999999");
  assert.equal(normalizeBrazilianPhone("5548999999999"), "48999999999");
  assert.equal(maskBrazilianPhoneInput("5548999999999"), "(48) 99999-9999");
  assert.equal(formatBrazilianPhone("48999999999"), "+55 (48) 99999-9999");
});

test("customerSchema rejeita WhatsApp inválido e grava o canônico", () => {
  for (const phone of ["48999999999", "(48) 99999-9999", "+55 48 99999-9999", "5548999999999"]) {
    const parsed = customerSchema.parse({ ...customer, phone });
    assert.equal(parsed.phone, "48999999999", phone);
  }

  for (const phone of ["", "   ", "abc", "4899999999", "489999999999", "48899999999"]) {
    assert.equal(customerSchema.safeParse({ ...customer, phone }).success, false, phone);
  }
});

test("CPF mascarado continua canônico de 11 dígitos", () => {
  assert.equal(formatCpf("52998224725"), "529.982.247-25");
  assert.equal(formatCpf("07912810943"), "079.128.109-43");
  assert.equal(normalizeCpf("529.982.247-25"), "52998224725");
  assert.equal(customerSchema.parse({ ...customer, document: "529.982.247-25" }).document, "52998224725");
});

test("CEP mascarado continua canônico de 8 dígitos", () => {
  assert.equal(formatCep("01310100"), "01310-100");
  assert.equal(formatCep("88164220"), "88164-220");
  assert.equal(normalizeCep("01310-100"), "01310100");
  assert.equal(
    shippingAddressSchema.parse({
      zip: "01310-100",
      street: "Avenida Paulista",
      number: "1000",
      district: "Bela Vista",
      city: "São Paulo",
      state: "SP",
    }).zip,
    "01310100",
  );
});

test("checkoutPaySchema rejeita complemento acima de 20 antes do pagamento", () => {
  const payment = {
    kind: "physical" as const,
    quantity: 1,
    ebookBump: false,
    customer,
    paymentAttemptId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    payment: { method: "pix" as const },
  };
  const shipping = {
    zip: "01310-100",
    street: "Avenida Paulista",
    number: "1000",
    district: "Bela Vista",
    city: "São Paulo",
    state: "SP" as const,
  };

  const accepted = checkoutPaySchema.parse({
    ...payment,
    shipping: { ...shipping, complement: "A".repeat(20) },
  });
  assert.equal(accepted.kind === "physical" && accepted.shipping.complement, "A".repeat(20));
  assert.equal(
    checkoutPaySchema.safeParse({
      ...payment,
      shipping,
    }).success,
    true,
  );
  assert.equal(
    checkoutPaySchema.safeParse({
      ...payment,
      shipping: { ...shipping, complement: "" },
    }).success,
    true,
  );
  assert.equal(
    checkoutPaySchema.safeParse({
      ...payment,
      shipping: { ...shipping, complement: "A".repeat(21) },
    }).success,
    false,
  );
});

test("POST de pagamento recebe telefone com 11 dígitos", () => {
  const parsed = checkoutPaySchema.parse({
    kind: "digital",
    customer: { ...customer, phone: "+55 48 99999-9999", document: "529.982.247-25" },
    paymentAttemptId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    payment: { method: "pix" },
  });
  assert.equal(parsed.customer.phone, "48999999999");
  assert.equal(parsed.customer.document, "52998224725");
  assert.equal(checkoutPaySchema.safeParse({
    kind: "digital",
    customer: { ...customer, phone: "abc" },
    paymentAttemptId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    payment: { method: "pix" },
  }).success, false);
});
