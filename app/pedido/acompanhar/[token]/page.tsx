import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import OrderTrackingSummaryCard from "@/components/order-tracking/OrderTrackingSummaryCard";
import TrackingTimeline from "@/components/order-tracking/TrackingTimeline";
import { resolveOrderTracking } from "@/lib/order-tracking/resolve";
import { supabaseOrderTrackingStore } from "@/lib/order-tracking/store";
import type { OrderTrackingPublicView } from "@/lib/order-tracking/types";
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

function TrackingUnavailable() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-5 py-12 md:px-8 md:py-16 lg:max-w-5xl">
      <p className="font-sans text-[0.7rem] tracking-[0.16em] text-ink/50 uppercase">Pedido</p>
      <h1 className="mt-3 font-display text-3xl tracking-tight text-ink md:text-4xl">
        Acompanhar pedido
      </h1>
      <p className="mt-4 max-w-md font-sans text-sm leading-relaxed text-ink/75">
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
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-5 py-12 md:px-8 md:py-16 lg:max-w-5xl lg:py-20">
      <header className="max-w-2xl border-b border-rule pb-8 md:pb-10">
        <p className="font-sans text-[0.7rem] tracking-[0.16em] text-ink/50 uppercase">Pedido</p>
        <h1 className="mt-3 font-display text-[2rem] leading-[1.1] tracking-tight text-ink md:text-4xl lg:text-[2.75rem]">
          {view.friendlyCode}
        </h1>
        {view.firstName ? (
          <p className="mt-4 font-sans text-sm text-ink/70 md:text-[0.95rem]">
            Olá, {view.firstName}.
          </p>
        ) : null}
        <p className="mt-2 font-display text-lg leading-snug text-ink italic md:text-xl">
          {view.statusMessage}
        </p>
      </header>

      <div className="mt-10 grid gap-10 lg:mt-12 lg:grid-cols-[minmax(0,1.35fr)_minmax(17rem,0.85fr)] lg:items-start lg:gap-14">
        <section aria-labelledby="acompanhamento-heading">
          <h2
            id="acompanhamento-heading"
            className="font-display text-xl tracking-tight text-ink md:text-[1.35rem]"
          >
            Acompanhamento
          </h2>
          <div className="mt-6 md:mt-7">
            <TrackingTimeline steps={view.timeline} trackingCode={view.trackingCode} />
          </div>
        </section>

        <OrderTrackingSummaryCard items={view.items} destination={destination} />
      </div>

      <div className="mt-12 border-t border-rule pt-8 lg:mt-10 lg:pt-6">
        <Link
          href="/"
          className="inline-flex min-h-12 w-fit items-center justify-center border border-rule bg-paper-strong px-5 font-sans text-sm font-medium tracking-[0.08em] text-ink uppercase transition-colors hover:bg-white"
        >
          Voltar ao site
        </Link>
      </div>
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
