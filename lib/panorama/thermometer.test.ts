import { strict as assert } from "node:assert";
import { test } from "node:test";
import { parseThermometer, updateThermometerBody, updateThermometerMetric } from "./thermometer";

const fixture = [
 "🌐 PANORAMA 360°",
 "SEGUNDA-FEIRA, 09 DE NOVEMBRO DE 2026",
 "📊 1. TERMÔMETRO ECONÔMICO",
 "",
 "Referência: fechamento de sexta-feira, 06/11/2026. Não são cotações em tempo real.",
 "",
 "🇧🇷 BRASIL",
 "",
 "• Dólar comercial: R$ 5,5087",
 "• Ibovespa: 168.498,45 pontos",
 "",
 "🌍 COMMODITIES",
 "",
 "• Petróleo Brent: US$ 98,32 por barril, na referência de sexta-feira.",
 "",
 "Leitura dos indicadores:",
 "",
 "Os juros brasileiros continuam elevados.",
 "",
 "O petróleo merece atenção especial: sua volatilidade pode alterar as expectativas.",
 "⸻",
 "🇧🇷 2. BRASIL — NOTÍCIA DO DIA",
 "Texto da notícia com valor: 123",
].join("\n");

test("09/11: separate reference, geographic groups, indicators and reading", () => {
 const body = fixture.split("📊 1. TERMÔMETRO ECONÔMICO")[1].split("⸻")[0].trim();
 const parsed = parseThermometer(body);
 assert.equal(parsed.reference.length, 1);
 assert.equal(parsed.groups.length, 2);
 assert.equal(parsed.groups[0].title, "🇧🇷 BRASIL");
 assert.equal(parsed.groups[0].metrics[0].label, "Dólar comercial");
 assert.equal(parsed.groups[1].metrics[0].value, "US$ 98,32 por barril, na referência de sexta-feira.");
 assert.equal(parsed.hasReading, true);
 assert.match(parsed.reading, /O petróleo merece atenção especial:/);
 assert.equal(parsed.groups.flatMap((group) => group.metrics).length, 3);
});

test("read November 12 style with unlabeled indicators and market reading", () => {
 const body = ["Indicadores do fechamento de 11/11/2026",
   "🇧🇷 Ibovespa: 172.060 pontos | +0,42%", "💵 Dólar comercial: R$ 5,56 | -0,43%",
   "Leitura dos mercados", "A Bolsa brasileira encerrou o dia em alta."].join("\n");
 const parsed = parseThermometer(body);
 assert.equal(parsed.groups.length, 1);
 assert.equal(parsed.reference.length, 1);
 assert.equal(parsed.groups[0].metrics.length, 2);
 assert.equal(parsed.groups[0].metrics[0].label, "Ibovespa");
 assert.equal(parsed.hasReading, true);
 assert.match(parsed.reading, /Bolsa/);
});

test("inline value patch affects only the chosen economic metric in TXT", () => {
 const body = fixture.split("📊 1. TERMÔMETRO ECONÔMICO")[1].split("⸻")[0].trim();
 const index = parseThermometer(body).groups[0].metrics[0].lineIndex;
 const edited = updateThermometerMetric(fixture, index, "R$ 5,6000");
 assert.match(edited, /Dólar comercial: R\$ 5,6000/);
 assert.match(edited, /Ibovespa: 168.498,45 pontos/);
 assert.match(edited, /BRASIL — NOTÍCIA DO DIA/);
 assert.match(edited, /O petróleo merece atenção especial:/);
 assert.doesNotMatch(edited, /Dólar comercial: R\$ 5,5087/);
});

test("replace full thermometer section without altering other articles", () => {
 const edited = updateThermometerBody(fixture, "💵 Dólar: R$ 5,50\n🔎 LEITURA DO MERCADO\nAtenção.");
 assert.match(edited, /💵 Dólar: R\$ 5,50/);
 assert.match(edited, /Texto da notícia com valor: 123/);
 assert.doesNotMatch(edited, /168.498,45/);
});
