"use client";

import Link from "next/link";
import { approvedPaymentCopy } from "@/lib/payments/pix-status-polling";
import type { PurchaseKind } from "@/lib/commerce/selection";

type PaymentApprovedProps = {
  kind: PurchaseKind;
};

export default function PaymentApproved({ kind }: PaymentApprovedProps) {
  const copy = approvedPaymentCopy(kind);

  return (
    <div className="rounded-xl border border-rule bg-white px-5 py-7 md:px-7 md:py-8">
      <h3 className="font-display text-2xl tracking-tight text-ink">{copy.title}</h3>
      <p className="mt-3 font-sans text-sm leading-relaxed text-ink">{copy.confirmed}</p>
      {copy.emailNotice ? (
        <p className="mt-3 font-sans text-sm leading-relaxed text-ink">{copy.emailNotice}</p>
      ) : null}
      <Link
        href={copy.ctaHref}
        className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-lg border border-rule bg-white px-5 font-sans text-sm font-medium tracking-[0.08em] text-ink uppercase"
      >
        {copy.ctaLabel}
      </Link>
    </div>
  );
}
