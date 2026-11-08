import type { MarketSlug } from "@/lib/panorama/market";

type IconProps = { slug: MarketSlug; size?: "sm" | "md" };

const palette: Record<string, string> = {
  ibovespa: "border-[#cce2ee] bg-[#e5f3fa] text-[#20668b]",
  dolar: "border-[#cce9da] bg-[#eaf6ee] text-[#287b54]",
  euro: "border-[#d6dff1] bg-[#edf1fb] text-[#3c5f9d]",
  selic: "border-[#d7deea] bg-[#edf2f7] text-[#43627e]",
  bitcoin: "border-[#f4dfbe] bg-[#fff2df] text-[#b57620]",
  ouro: "border-[#eee0b8] bg-[#faf1d7] text-[#ad802b]",
  inflacao: "border-[#f2d9d3] bg-[#fff0eb] text-[#bd6b53]",
  nasdaq: "border-[#d4d9ec] bg-[#e9edfa] text-[#365f9a]",
  sp500: "border-[#d7e8e8] bg-[#e9f7f6] text-[#276879]",
  dowjones: "border-[#dfe1e7] bg-[#f0f2f7] text-[#53657d]",
};

function MarketGlyph({ slug }: { slug: MarketSlug }) {
  if (slug === "bitcoin" || slug === "dolar" || slug === "euro" || slug === "selic") {
    const symbol = { bitcoin: "₿", dolar: "$", euro: "€", selic: "%" }[slug];
    return <span aria-hidden="true" className="font-sans text-xl font-extrabold leading-none">{symbol}</span>;
  }

  if (slug === "ouro") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-6 w-6">
        <path d="m6.2 9 2.2-4h7.2l2.2 4-2.2 4H4l2.2-4Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M8.4 5 11 9m4.6-4L13 9M4 13l-2 5h20l-2-5H4Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="m9 13 2.5 5m4-5-2.5 5" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    );
  }

  if (slug === "ibovespa" || slug === "nasdaq" || slug === "sp500" || slug === "dowjones") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 19h18M5 16v-3m5 3V9m5 7v-5m5 5V6" opacity=".65" />
        <path d="m4.5 10 5-4 4 3 6.5-5m-4 0h4v4" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.5 5h12l5 5v9H3.5V5Z" />
      <path d="M15.5 5v5h5" />
      <path d="m7 15 3.2-3.3 2.4 2.5 3.4-4" />
      <path d="m13.6 10.2 2.4-.2-.1 2.4" />
    </svg>
  );
}

export default function MarketIndicatorIcon({ slug, size = "sm" }: IconProps) {
  return (
    <span aria-hidden="true" className={
      "inline-flex shrink-0 items-center justify-center rounded-xl border " + (palette[slug] ?? "border-[#d5e2e9] bg-[#eef4f7] text-[#416782]")
      + (size === "md" ? " h-12 w-12" : " h-9 w-9")
    }>
      <MarketGlyph slug={slug} />
    </span>
  );
}
