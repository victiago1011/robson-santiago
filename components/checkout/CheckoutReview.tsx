import type { CheckoutReviewData } from "@/lib/commerce/checkout-review";

type CheckoutReviewProps = {
  review: CheckoutReviewData;
};

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-sans text-[0.7rem] font-medium tracking-[0.18em] text-ink-soft uppercase">{label}</dt>
      <dd className="mt-1 font-sans text-base whitespace-pre-line text-ink">{value}</dd>
    </div>
  );
}

function shippingSummary(shipping: NonNullable<CheckoutReviewData["shipping"]>): string {
  const lines = [`${shipping.street}, ${shipping.number}`];
  if (shipping.complement) {
    lines.push(shipping.complement);
  }
  lines.push(`${shipping.district} — ${shipping.city}/${shipping.state}`);
  lines.push(`CEP ${shipping.zip}`);
  return lines.join("\n");
}

export default function CheckoutReview({ review }: CheckoutReviewProps) {
  const shipping = review.shipping;
  const address = shipping ? shippingSummary(shipping) : "";

  return (
    <section aria-labelledby="revisao-heading" className="min-w-0">
      <h2 id="revisao-heading" className="font-display text-2xl tracking-tight text-ink md:text-[1.75rem]">
        Revisão
      </h2>
      <dl className="mt-6 grid gap-4">
        <ReviewRow label="Nome" value={review.customer.name} />
        <ReviewRow label="E-mail" value={review.customer.email} />
        <ReviewRow label="WhatsApp" value={review.customer.phone} />
        <ReviewRow label="CPF" value={review.customer.document} />
        {shipping ? <ReviewRow label="Entrega" value={address} /> : null}
      </dl>
    </section>
  );
}
