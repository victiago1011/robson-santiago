import assert from "node:assert/strict";
import { test } from "node:test";
import { marketDate, marketMovement, publishedMarketIndicators, MARKET_SLUGS, type MarketIndicator } from "./market";

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
  assert.equal(marketDate("2026-11-04"), "04/11/2026");
});
