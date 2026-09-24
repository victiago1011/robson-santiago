import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

test("consultas do admin não leem segredo de download e agregam os indicadores numa leitura", () => {
  const source = readFileSync(join(process.cwd(), "lib", "admin", "queries.ts"), "utf8");
  assert.equal(source.includes("token_hash"), false);
  assert.equal(source.includes("digital_file_path"), false);
  assert.equal(source.includes("signed"), false);
  assert.equal(source.includes("list_admin_physical_orders"), false);

  const facts = source.slice(source.indexOf("const FACT_SELECT"), source.indexOf("const LIST_CORE"));
  assert.equal(facts.includes("customer_email"), false);
  assert.equal(facts.includes("customer_document"), false);
  assert.equal(facts.includes("customer_phone"), false);
  assert.equal(facts.includes("order_items"), true);
  assert.equal(facts.includes("updated_at"), true);
  assert.equal(facts.includes("created_at"), true);

  const loader = source.slice(
    source.indexOf("export const loadAdminOrderFacts"),
    source.indexOf("export async function listAttentionOrders"),
  );
  assert.equal(loader.split('.from("orders")').length - 1, 1);
  assert.equal(loader.includes(".range("), true);

  assert.equal(source.includes("export async function listFilteredPhysicalOrders"), true);
  assert.equal(source.split("export async function listFilteredPhysicalOrders").length - 1, 1);
  assert.equal(source.includes(".range("), true);
});

test("a API antiga de pedidos físicos permanece isolada do painel novo", () => {
  const store = readFileSync(join(process.cwd(), "lib", "admin", "order-store.ts"), "utf8");
  const listRoute = readFileSync(
    join(process.cwd(), "app", "api", "admin", "orders", "route.ts"),
    "utf8",
  );
  assert.equal(store.includes("list_admin_physical_orders"), true);
  assert.equal(listRoute.includes("listPhysicalOrders"), true);
  assert.equal(listRoute.includes("lib/admin/queries"), false);
});
