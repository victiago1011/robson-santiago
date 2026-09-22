import { InputField } from "@/components/checkout/Field";
import type { CheckoutFieldErrors, CheckoutFieldId } from "@/lib/commerce/checkout-field-errors";
import { formatCpf } from "@/lib/commerce/cpf";
import { maskBrazilianPhoneInput } from "@/lib/commerce/phone";

type CustomerFieldsProps = {
  errors?: CheckoutFieldErrors;
  onClearField?: (id: CheckoutFieldId) => void;
};

export default function CustomerFields({ errors = {}, onClearField }: CustomerFieldsProps) {
  return (
    <fieldset className="min-w-0 border-0 p-0">
      <legend className="font-display text-2xl tracking-tight text-ink md:text-[1.75rem]">
        Seus dados
      </legend>
      <div className="mt-8 grid gap-1 sm:grid-cols-2 sm:gap-x-5">
        <div className="sm:col-span-2">
          <InputField
            id="customer_name"
            name="customer_name"
            label="Nome completo"
            autoComplete="name"
            autoCapitalize="words"
            placeholder="Ex.: João da Silva"
            required
            error={errors.customer_name}
            onInput={() => onClearField?.("customer_name")}
          />
        </div>
        <InputField
          id="customer_email"
          name="customer_email"
          label="E-mail"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          error={errors.customer_email}
          onInput={() => onClearField?.("customer_email")}
        />
        <InputField
          id="customer_phone"
          name="customer_phone"
          label="WhatsApp"
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          prefix="+55"
          placeholder="(00) 00000-0000"
          required
          error={errors.customer_phone}
          onInput={(event) => {
            const input = event.currentTarget;
            const next = maskBrazilianPhoneInput(input.value);
            if (input.value !== next) {
              input.value = next;
            }
            onClearField?.("customer_phone");
          }}
        />
        <div className="sm:col-span-2 sm:max-w-xs">
          <InputField
            id="customer_document"
            name="customer_document"
            label="CPF"
            inputMode="numeric"
            autoComplete="off"
            required
            error={errors.customer_document}
            onInput={(event) => {
              const input = event.currentTarget;
              const next = formatCpf(input.value);
              if (input.value !== next) {
                input.value = next;
              }
              onClearField?.("customer_document");
            }}
          />
        </div>
      </div>
    </fieldset>
  );
}
