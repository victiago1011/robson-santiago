import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { resolveOrderTracking } from "@/lib/order-tracking/resolve";
import { supabaseOrderTrackingStore } from "@/lib/order-tracking/store";
import type { OrderTrackingPublicView, TimelineStepState } from "@/lib/order-tracking/types";
import { SupabaseNotConfiguredError } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Acompanhar pedido — Robson Santiago",
  description: "Acompanhe o status do seu pedido.",
  robots: {
    index: false,
    follow: false,
  },
};

type PageProps = {
  params: Promise<{ token: string }>;
};

function stepMarker(state: TimelineStepState): string {
  if (state === "done") {
    return "✓";
  }
  if (state === "current") {
    return "●";
  }
  return "○";
}

function TrackingUnavailable() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-5 py-12 md:px-8 md:py-16">
      <h1 className="font-display text-3xl tracking-tight text-ink md:text-4xl">
        Acompanhar pedido
      </h1>
      <p className="mt-4 font-sans text-sm leading-relaxed text-ink/80">
        Não foi possível encontrar este acompanhamento. Verifique o link do e-mail ou tente
        novamente mais tarde.
      </p>
      <Link
        href="/"
        className="mt-10 inline-flex min-h-12 w-fit items-center justify-center border border-rule bg-ink px-5 font-sans text-sm font-medium tracking-[0.08em] text-paper uppercase"
      >
        Voltar ao site
      </Link>
    </main>
  );
}

function TrackingView({ view }: { view: OrderTrackingPublicView }) {
  const destination =
    view.city && view.region
      ? `${view.city}/${view.region}`
      : view.city || view.region || null;

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-5 py-12 md:px-8 md:py-16">
      <p className="font-sans text-xs tracking-[0.14em] text-ink/55 uppercase">Pedido</p>
      <h1 className="mt-2 font-display text-3xl tracking-tight text-ink md:text-4xl">
        {view.friendlyCode}
      </h1>

      {view.firstName ? (
        <p className="mt-4 font-sans text-sm text-ink/75">Olá, {view.firstName}.</p>
      ) : null}

      <section className="mt-10">
        <h2 className="font-display text-xl text-ink">Pagamento</h2>
        <p className="mt-3 font-sans text-sm text-ink">✓ Pagamento confirmado</p>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-xl text-ink">Acompanhamento</h2>
        <ol className="mt-4 space-y-3">
          {view.timeline.map((step) => (
            <li
              key={step.id}
              className={`flex gap-3 font-sans text-sm ${
                step.state === "upcoming" ? "text-ink/40" : "text-ink"
              }`}
            >
              <span className="w-4 shrink-0" aria-hidden>
                {stepMarker(step.state)}
              </span>
              <span>{step.label}</span>
            </li>
          ))}
        </ol>
      </section>

      {view.trackingCode ? (
        <section className="mt-10">
          <h2 className="font-display text-xl text-ink">Rastreio</h2>
          <p className="mt-3 font-sans text-sm text-ink">
            Código de rastreio:{" "}
            <span className="font-medium tracking-wide">{view.trackingCode}</span>
          </p>
        </section>
      ) : null}

      <section className="mt-10">
        <h2 className="font-display text-xl text-ink">Resumo</h2>
        <ul className="mt-3 space-y-1 font-sans text-sm text-ink">
          {view.items.map((item) => (
            <li key={`${item.title}-${item.quantity}`}>
              {item.title} × {item.quantity}
            </li>
          ))}
        </ul>
        {destination ? (
          <p className="mt-3 font-sans text-sm text-ink/70">Destino: {destination}</p>
        ) : null}
      </section>

      <Link
        href="/"
        className="mt-12 inline-flex min-h-12 w-fit items-center justify-center border border-rule bg-white px-5 font-sans text-sm font-medium tracking-[0.08em] text-ink uppercase"
      >
        Voltar ao site
      </Link>
    </main>
  );
}

export default async function AcompanharPedidoPage({ params }: PageProps) {
  await connection();

  let token: string;
  try {
    token = (await params).token;
  } catch {
    return <TrackingUnavailable />;
  }

  try {
    const result = await resolveOrderTracking(token, supabaseOrderTrackingStore);
    if (!result.ok) {
      return <TrackingUnavailable />;
    }
    return <TrackingView view={result.view} />;
  } catch (error) {
    if (error instanceof SupabaseNotConfiguredError) {
      return <TrackingUnavailable />;
    }
    console.error("order_tracking_page_unavailable", { code: "TRACKING_UNAVAILABLE" });
    return <TrackingUnavailable />;
  }
}
