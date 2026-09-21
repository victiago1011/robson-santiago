import assert from "node:assert/strict";
import { test } from "node:test";
import {
  CHECKOUT_FIELD_ORDER,
  checkoutFieldErrors,
  firstInvalidCheckoutField,
  type CheckoutCustomerInput,
  type CheckoutFieldErrors,
  type CheckoutShippingInput,
} from "@/lib/commerce/checkout-field-errors";

const emptyCustomer: CheckoutCustomerInput = {
  name: "",
  email: "",
  phone: "",
  document: "",
};

const emptyShipping: CheckoutShippingInput = {
  zip: "",
  street: "",
  number: "",
  district: "",
  city: "",
  state: "",
};

const validCustomer: CheckoutCustomerInput = {
  name: "Ana Souza",
  email: "ana@example.com",
  phone: "abc",
  document: "52998224725",
};

const validShipping: CheckoutShippingInput = {
  zip: "01310-100",
  street: "Av. Paulista",
  number: "1000",
  complement: "",
  district: "Bela Vista",
  city: "São Paulo",
  state: "SP",
};

test("e-book com campos vazios aponta só o comprador, na ordem do formulário", () => {
  const errors = checkoutFieldErrors({
    kind: "digital",
    customer: emptyCustomer,
    shipping: emptyShipping,
  });

  assert.deepEqual(errors, {
    customer_name: "Informe seu nome completo.",
    customer_email: "Informe um e-mail válido.",
    customer_phone: "Informe seu WhatsApp.",
    customer_document: "Informe um CPF válido.",
  });
  assert.equal(firstInvalidCheckoutField(errors), "customer_name");
});

test("físico com campos vazios exige comprador e endereço, sem complemento", () => {
  const errors = checkoutFieldErrors({
    kind: "physical",
    ebookBump: false,
    customer: emptyCustomer,
    shipping: emptyShipping,
  });

  assert.equal(errors.shipping_zip, "Informe o CEP.");
  assert.equal(errors.shipping_street, "Informe a rua.");
  assert.equal(errors.shipping_number, "Informe o número.");
  assert.equal(errors.shipping_district, "Informe o bairro.");
  assert.equal(errors.shipping_city, "Informe a cidade.");
  assert.equal(errors.shipping_state, "Selecione o estado.");
  assert.equal("shipping_complement" in errors, false);

  let remaining: CheckoutFieldErrors = { ...errors };
  const requiredOrder = CHECKOUT_FIELD_ORDER.filter((id) => id !== "shipping_complement");
  for (const id of requiredOrder) {
    assert.equal(firstInvalidCheckoutField(remaining), id);
    delete remaining[id];
  }
  assert.equal(firstInvalidCheckoutField(remaining), null);
});

test("físico com e-book não cria campo obrigatório novo", () => {
  const withoutBump = checkoutFieldErrors({
    kind: "physical",
    ebookBump: false,
    customer: validCustomer,
    shipping: validShipping,
  });
  const withBump = checkoutFieldErrors({
    kind: "physical",
    ebookBump: true,
    customer: validCustomer,
    shipping: validShipping,
  });

  assert.deepEqual(withoutBump, {});
  assert.deepEqual(withBump, {});
});

test("complemento vazio ou ausente continua válido", () => {
  assert.deepEqual(
    checkoutFieldErrors({
      kind: "physical",
      customer: validCustomer,
      shipping: { ...validShipping, complement: "" },
    }),
    {},
  );
  assert.deepEqual(
    checkoutFieldErrors({
      kind: "physical",
      customer: validCustomer,
      shipping: { ...validShipping, complement: undefined },
    }),
    {},
  );
});

test("CPF válido é aceito e CPF inválido marca o documento", () => {
  for (const document of ["52998224725", "529.982.247-25"]) {
    assert.deepEqual(
      checkoutFieldErrors({
        kind: "digital",
        customer: { ...validCustomer, document },
      }),
      {},
      document,
    );
  }

  for (const document of ["52998224726", "11111111111", "00000000000", "1234567890", "529982247251"]) {
    assert.equal(
      checkoutFieldErrors({
        kind: "digital",
        customer: { ...validCustomer, document },
      }).customer_document,
      "Informe um CPF válido.",
      document,
    );
  }
});

test("complemento vazio ou com 80 caracteres é válido e 81 marca o campo", () => {
  assert.deepEqual(
    checkoutFieldErrors({
      kind: "physical",
      customer: validCustomer,
      shipping: { ...validShipping, complement: "A".repeat(80) },
    }),
    {},
  );
  assert.equal(
    checkoutFieldErrors({
      kind: "physical",
      customer: validCustomer,
      shipping: { ...validShipping, complement: "A".repeat(81) },
    }).shipping_complement,
    "Use no máximo 80 caracteres.",
  );
});

test("WhatsApp segue só texto não vazio até 20 caracteres", () => {
  assert.deepEqual(
    checkoutFieldErrors({
      kind: "digital",
      customer: { ...validCustomer, phone: "abc" },
    }),
    {},
  );
  assert.deepEqual(
    checkoutFieldErrors({
      kind: "digital",
      customer: { ...validCustomer, phone: "12345678901234567890" },
    }),
    {},
  );
  assert.equal(
    checkoutFieldErrors({
      kind: "digital",
      customer: { ...validCustomer, phone: "   " },
    }).customer_phone,
    "Informe seu WhatsApp.",
  );
  assert.equal(
    checkoutFieldErrors({
      kind: "digital",
      customer: { ...validCustomer, phone: "123456789012345678901" },
    }).customer_phone,
    "Use no máximo 20 caracteres.",
  );
});

test("o primeiro campo inválido ignora a ordem de inserção do mapa", () => {
  const errors: CheckoutFieldErrors = {
    shipping_state: "Selecione o estado.",
    customer_email: "Informe um e-mail válido.",
    shipping_city: "Informe a cidade.",
  };

  assert.equal(firstInvalidCheckoutField(errors), "customer_email");
});

test("CEP incompleto e nome longo usam as regras do schema", () => {
  const errors = checkoutFieldErrors({
    kind: "physical",
    customer: { ...validCustomer, name: "A".repeat(121) },
    shipping: { ...validShipping, zip: "123" },
  });

  assert.equal(errors.customer_name, "Use no máximo 120 caracteres.");
  assert.equal(errors.shipping_zip, "Informe um CEP válido.");
});
