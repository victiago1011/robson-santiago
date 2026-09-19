import { InputField } from "@/components/checkout/Field";

type CustomerFieldsProps = {
  onEmailChange?: (value: string) => void;
  onDocumentChange?: (value: string) => void;
};

export default function CustomerFields({
  onEmailChange,
  onDocumentChange,
}: CustomerFieldsProps) {
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
            required
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
          onChange={(event) => onEmailChange?.(event.target.value)}
        />
        <InputField
          id="customer_phone"
          name="customer_phone"
          label="WhatsApp"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          required
        />
        <div className="sm:col-span-2 sm:max-w-xs">
          <InputField
            id="customer_document"
            name="customer_document"
            label="CPF"
            inputMode="numeric"
            autoComplete="off"
            onChange={(event) => onDocumentChange?.(event.target.value)}
            required
          />
        </div>
      </div>
    </fieldset>
  );
}
