import { marketDate, marketMovement, publishedMarketIndicators, type MarketIndicator } from "@/lib/panorama/market";

export default function MarketThermometerStrip({ indicators }: { indicators: readonly MarketIndicator[] }) {
  const visible = publishedMarketIndicators(indicators);
  return (
    <section aria-label="Termômetro econômico" className="border-b border-[#dfe6ed] bg-white">
      <div className="mx-auto max-w-[1230px] px-5 py-6 md:px-8">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-[0.67rem] font-extrabold uppercase tracking-[0.15em] text-[#ae8139]">Números em perspectiva</p>
            <h2 className="mt-1 text-xl font-extrabold tracking-tight text-[#0d2f4b] md:text-2xl">Termômetro econômico</h2>
          </div>
          <span className="text-[0.7rem] text-[#6c8194]">Dados informados manualmente • Não são cotações ao vivo</span>
        </div>
        {visible.length ? (
          <div className="-mx-5 flex snap-x gap-3 overflow-x-auto px-5 pb-2 md:mx-0 md:grid md:grid-cols-3 md:px-0 lg:grid-cols-7">
            {visible.map((item) => {
              const movement = marketMovement(item.direction);
              return (
                <article key={item.slug} className="min-w-[156px] shrink-0 snap-start rounded-xl border border-[#e1e8ee] bg-[#f8fafc] p-4 md:min-w-0">
                  <h3 className="text-[0.66rem] font-bold uppercase tracking-[0.07em] text-[#637b90]">{item.label}</h3>
                  <p className="mt-2 text-lg font-extrabold tracking-tight text-[#12344f]">{item.display_value}</p>
                  <p className={"mt-2 text-xs font-bold " + movement.color} aria-label={movement.label}>
                    <span aria-hidden="true">{movement.symbol}</span> {item.variation || movement.label}
                  </p>
                  <p className="mt-2 text-[0.63rem] text-[#6a8195]">
                    Ref. <time dateTime={item.reference_on ?? undefined}>{item.reference_on ? marketDate(item.reference_on) : ""}</time>
                  </p>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-[#d7e1e8] bg-[#f6f9fb] p-5 text-sm text-[#63798c]">
            Os indicadores serão exibidos assim que o Robson confirmar os números e as datas no painel administrativo.
          </div>
        )}
      </div>
    </section>
  );
}
