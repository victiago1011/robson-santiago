import { InputField, SelectField } from "@/components/checkout/Field";
import { BRAZILIAN_STATES } from "@/lib/commerce/address";
import type { CheckoutFieldErrors, CheckoutFieldId } from "@/lib/commerce/checkout-field-errors";

type ShippingFieldsProps = {
  errors?: CheckoutFieldErrors;
  onClearField?: (id: CheckoutFieldId) => void;
};

export default function ShippingFields({ errors = {}, onClearField }: ShippingFieldsProps) {
  return (
    <fieldset className="min-w-0 border-0 p-0">
      <legend className="font-display text-2xl tracking-tight text-ink md:text-[1.75rem]">
        Entrega
      </legend>
      <div className="mt-8 grid gap-1 sm:grid-cols-6 sm:gap-x-5">
        <div className="sm:col-span-2">
          <InputField
            id="shipping_zip"
            name="shipping_zip"
            label="CEP"
            inputMode="numeric"
            autoComplete="postal-code"
            maxLength={9}
            placeholder="00000-000"
            data-checkout="cep"
            required
            error={errors.shipping_zip}
            onInput={() => onClearField?.("shipping_zip")}
          />
        </div>
        <div className="sm:col-span-4 sm:col-start-1">
          <InputField
            id="shipping_street"
            name="shipping_street"
            label="Rua"
            autoComplete="address-line1"
            required
            error={errors.shipping_street}
            onInput={() => onClearField?.("shipping_street")}
          />
        </div>
        <div className="sm:col-span-2">
          <InputField
            id="shipping_number"
            name="shipping_number"
            label="Número"
            autoComplete="on"
            required
            error={errors.shipping_number}
            onInput={() => onClearField?.("shipping_number")}
          />
        </div>
        <div className="sm:col-span-6">
          <InputField
            id="shipping_complement"
            name="shipping_complement"
            label="Complemento"
            autoComplete="address-line2"
          />
        </div>
        <div className="sm:col-span-6">
          <InputField
            id="shipping_district"
            name="shipping_district"
            label="Bairro"
            autoComplete="address-level3"
            required
            error={errors.shipping_district}
            onInput={() => onClearField?.("shipping_district")}
          />
        </div>
        <div className="sm:col-span-4">
          <InputField
            id="shipping_city"
            name="shipping_city"
            label="Cidade"
            autoComplete="address-level2"
            required
            error={errors.shipping_city}
            onInput={() => onClearField?.("shipping_city")}
          />
        </div>
        <div className="sm:col-span-2">
          <SelectField
            id="shipping_state"
            name="shipping_state"
            label="Estado"
            autoComplete="address-level1"
            defaultValue=""
            required
            error={errors.shipping_state}
            onChange={() => onClearField?.("shipping_state")}
          >
            <option value="" disabled>
              UF
            </option>
            {BRAZILIAN_STATES.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </SelectField>
        </div>
      </div>
    </fieldset>
  );
}
