import assert from "node:assert/strict";
import { test } from "node:test";
import { indicatorMatches, indicatorSlug, indicatorsForEdition, marketDate, marketMovement, publishedMarketIndicators, MARKET_SLUGS, type MarketIndicator } from "./market";

function example(slug: MarketIndicator["slug"], values: Partial<MarketIndicator> = {}): MarketIndicator {
  return { slug, label: slug, display_order: MARKET_SLUGS.indexOf(slug)+1, display_value: "123",
    variation: "1,23%", direction: "up", reference_on: "2026-11-04", visible: true, ...values };
}
test("only visible, dated, nonempty values reach the public", () => {
  const rows = [
    example("dolar", { visible: false }),
    example("ibovespa"),
    example("selic", { reference_on: null }),
    example("ouro", { display_value: "" }),
    example("bitcoin", { display_order: 3 }),
  ];
  assert.deepEqual(publishedMarketIndicators(rows).map((r) => r.slug), ["ibovespa", "bitcoin"]);
});
test("arrows show direction, not investment recommendation", () => {
  assert.equal(marketMovement("up").symbol, "▲");
  assert.equal(marketMovement("down").symbol, "▼");
  assert.equal(marketMovement("flat").symbol, "—");
  assert.equal(marketMovement("flat").label, "Neutro");
  assert.equal(marketDate("2026-11-04"), "04/11/2026");
});

test("clicar em outra data altera o termômetro e nunca usa cotação de outro dia", () => {
  const snapshots = [
    { ...example("ibovespa", { display_value: "166.191" }), edition_on: "2026-11-05" },
    { ...example("ibovespa", { display_value: "168.003" }), edition_on: "2026-11-06" },
    { ...example("dolar", { display_value: "R$ 5,42" }), edition_on: "2026-11-06" },
  ];
  assert.deepEqual(indicatorsForEdition(snapshots, "2026-11-05").map((item) => item.display_value), ["166.191"]);
  assert.deepEqual(indicatorsForEdition(snapshots, "2026-11-06").map((item) => item.display_value), ["168.003", "R$ 5,42"]);
  assert.deepEqual(indicatorsForEdition(snapshots, "2026-11-04"), []);
});

test("indicadores personalizados usam slug estável e impedem nomes duplicados", () => {
  assert.equal(indicatorSlug("Petróleo Brent"), "petroleo-brent");
  assert.equal(indicatorSlug(" Dólar "), "dolar");
  assert.equal(indicatorMatches("PETRÓLEO Brent", "Petroleo-brent"), true);
  assert.equal(indicatorMatches("Ouro", "Ibovespa"), false);
  const custom = example("petroleo-brent", {
    label: "Petróleo Brent", display_value: "US$ 65,90", visible: true,
  });
  assert.deepEqual(publishedMarketIndicators([custom]).map((x) => x.slug), ["petroleo-brent"]);
});
