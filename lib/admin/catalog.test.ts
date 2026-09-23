import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { DIGITAL_SKU, PHYSICAL_SKU } from "@/lib/commerce/selection";
import {
  attentionQueue,
  deriveMetrics,
  digitalDeliveryCopy,
  ebookOriginLabel,
  eventDetail,
  eventLabel,
  matchesComposition,
  matchesPaymentFilter,
  matchesShipmentFilter,
  pageSlice,
  type AdminOrderFact,
} from "@/lib/admin/catalog";
import { ADMIN_ORDERS_PAGE_SIZE } from "@/lib/admin/orders";
import { toOrderScreen, type AdminOrderRecord } from "@/lib/admin/order-screen";
import { catalogListHref, paymentListPath, physicalListPath, withPage } from "@/lib/admin/paths";

function fact(
  id: string,
  extras: Partial<AdminOrderFact> & { items: AdminOrderFact["items"] },
): AdminOrderFact {
  return {
    id,
    totalCents: 5490,
    paymentStatus: "approved",
    fulfillmentStatus: "pending",
    paidAt: "2026-09-01T12:00:00.000Z",
    createdAt: "2026-09-01T11:00:00.000Z",
    ...extras,
  };
}

function record(extras: Partial<AdminOrderRecord> = {}): AdminOrderRecord {
  return {
    id: "00000000-0000-4000-8000-000000000010",
    publicId: "a1b2c3d4-e5f6-4789-a123-456789abcdef",
    createdAt: "2026-09-10T15:00:00.000Z",
    paidAt: "2026-09-10T15:04:00.000Z",
    buyerName: "Ana",
    email: "ana@example.com",
    phone: "11987654321",
    document: "12345678909",
    zip: "01310100",
    street: "Rua da Consolação",
    number: "10",
    complement: null,
    district: "Consolação",
    city: "São Paulo",
    state: "SP",
    subtotalCents: 5980,
    discountCents: 990,
    shippingCents: 1500,
    totalCents: 6490,
    paymentStatus: "approved",
    fulfillmentStatus: "pending",
    trackingCode: null,
    shippedAt: null,
    items: [
      {
        sku: PHYSICAL_SKU,
        title: "Livro",
        quantity: 1,
        unitPriceCents: 3990,
        totalPriceCents: 3990,
      },
    ],
    payments: [],
    deliveries: [],
    events: [],
    ...extras,
  };
}

test("métricas usam só pedidos do status certo e somam quantidades", () => {
  const metrics = deriveMetrics([
    fact("00000000-0000-4000-8000-000000000001", {
      paymentStatus: "approved",
      fulfillmentStatus: "pending",
      totalCents: 6490,
      items: [
        { sku: PHYSICAL_SKU, quantity: 2 },
        { sku: DIGITAL_SKU, quantity: 1 },
      ],
    }),
    fact("00000000-0000-4000-8000-000000000002", {
      paymentStatus: "approved",
      fulfillmentStatus: "shipped",
      totalCents: 1990,
      items: [{ sku: DIGITAL_SKU, quantity: 1 }],
    }),
    fact("00000000-0000-4000-8000-000000000003", {
      paymentStatus: "pending",
      fulfillmentStatus: "pending",
      totalCents: 3990,
      paidAt: null,
      items: [{ sku: PHYSICAL_SKU, quantity: 4 }],
    }),
    fact("00000000-0000-4000-8000-000000000004", {
      paymentStatus: "rejected",
      totalCents: 1000,
      items: [{ sku: PHYSICAL_SKU, quantity: 1 }],
    }),
    fact("00000000-0000-4000-8000-000000000005", {
      paymentStatus: "cancelled",
      totalCents: 500,
      items: [{ sku: DIGITAL_SKU, quantity: 1 }],
    }),
    fact("00000000-0000-4000-8000-000000000006", {
      paymentStatus: "refunded",
      fulfillmentStatus: "delivered",
      totalCents: 7000,
      items: [{ sku: PHYSICAL_SKU, quantity: 1 }],
    }),
    fact("00000000-0000-4000-8000-000000000007", {
      paymentStatus: "approved",
      fulfillmentStatus: "preparing",
      totalCents: null,
      items: [{ sku: PHYSICAL_SKU, quantity: 1 }],
    }),
  ]);

  assert.equal(metrics.paidOrders, 3);
  assert.equal(metrics.physicalBooksSold, 3);
  assert.equal(metrics.ebooksSold, 2);
  assert.equal(metrics.awaitingShipment, 2);
  assert.equal(metrics.shipped, 0);
  assert.equal(metrics.delivered, 1);
  assert.equal(metrics.pendingPayments, 1);
  assert.equal(metrics.declinedPayments, 2);
  assert.equal(metrics.approvedRevenueCents, 8480);
  assert.equal(metrics.pendingRevenueCents, 3990);
  assert.equal(metrics.declinedRevenueCents, 1500);
});

test("faturamento sem pedidos aprovados é zero e não trata total nulo como zero quando há pedido", () => {
  assert.equal(deriveMetrics([]).approvedRevenueCents, 0);
  assert.equal(
    deriveMetrics([
      fact("00000000-0000-4000-8000-000000000008", {
        totalCents: null,
        items: [{ sku: PHYSICAL_SKU, quantity: 1 }],
      }),
    ]).approvedRevenueCents,
    null,
  );
});

test("fila de atenção traz físicos pagos ainda não enviados, os mais antigos primeiro", () => {
  const older = fact("00000000-0000-4000-8000-000000000011", {
    paidAt: "2026-08-01T10:00:00.000Z",
    createdAt: "2026-08-01T09:00:00.000Z",
    fulfillmentStatus: "preparing",
    items: [
      { sku: PHYSICAL_SKU, quantity: 1 },
      { sku: DIGITAL_SKU, quantity: 1 },
    ],
  });
  const newer = fact("00000000-0000-4000-8000-000000000012", {
    paidAt: "2026-09-20T10:00:00.000Z",
    items: [{ sku: PHYSICAL_SKU, quantity: 1 }],
  });
  const pendingPayment = fact("00000000-0000-4000-8000-000000000013", {
    paymentStatus: "pending",
    paidAt: "2026-01-01T10:00:00.000Z",
    items: [{ sku: PHYSICAL_SKU, quantity: 1 }],
  });
  const ebookOnly = fact("00000000-0000-4000-8000-000000000014", {
    paidAt: "2026-01-02T10:00:00.000Z",
    items: [{ sku: DIGITAL_SKU, quantity: 1 }],
  });
  const shipped = fact("00000000-0000-4000-8000-000000000015", {
    fulfillmentStatus: "shipped",
    paidAt: "2026-01-03T10:00:00.000Z",
    items: [{ sku: PHYSICAL_SKU, quantity: 1 }],
  });

  const queue = attentionQueue(
    [newer, pendingPayment, ebookOnly, shipped, older],
    8,
  );

  assert.deepEqual(
    queue.map((order) => order.id),
    [older.id, newer.id],
  );
});

test("filtros de envio, pagamento e composição", () => {
  const physical = {
    paymentStatus: "approved",
    fulfillmentStatus: "pending",
    items: [{ sku: PHYSICAL_SKU }, { sku: DIGITAL_SKU }],
  };
  const ebook = {
    paymentStatus: "rejected",
    fulfillmentStatus: "pending",
    items: [{ sku: DIGITAL_SKU }],
  };

  assert.equal(matchesShipmentFilter(physical, "awaiting"), true);
  assert.equal(matchesShipmentFilter(physical, "shipped"), false);
  assert.equal(matchesShipmentFilter({ ...physical, fulfillmentStatus: "shipped" }, "shipped"), true);
  assert.equal(matchesShipmentFilter({ ...physical, fulfillmentStatus: "delivered" }, "delivered"), true);
  assert.equal(matchesShipmentFilter(ebook, "all"), false);
  assert.equal(matchesPaymentFilter("refunded", "declined"), false);
  assert.equal(matchesPaymentFilter("rejected", "declined"), true);
  assert.equal(matchesPaymentFilter("cancelled", "declined"), true);
  assert.equal(matchesPaymentFilter("pending", "pending"), true);
  assert.equal(matchesPaymentFilter("approved", "approved"), true);
  assert.equal(matchesComposition(physical.items, "both"), true);
  assert.equal(matchesComposition(physical.items, "physical"), true);
  assert.equal(matchesComposition(ebook.items, "ebook"), true);
  assert.equal(matchesComposition(ebook.items, "both"), false);
});

test("paginação de 20 preserva a ordem já filtrada", () => {
  const rows = Array.from({ length: 25 }, (_, index) => index + 1);
  const first = pageSlice(rows, 1, ADMIN_ORDERS_PAGE_SIZE);
  const second = pageSlice(rows, 2, ADMIN_ORDERS_PAGE_SIZE);
  assert.equal(first.total, 25);
  assert.equal(first.rows.length, 20);
  assert.equal(first.rows[0], 1);
  assert.equal(second.rows.length, 5);
  assert.equal(second.rows[0], 21);
});

test("origem do e-book distingue avulso e adicional pelo item, não pelo código promocional", () => {
  assert.equal(ebookOriginLabel([{ sku: DIGITAL_SKU }]), "E-book avulso");
  assert.equal(
    ebookOriginLabel([{ sku: PHYSICAL_SKU }, { sku: DIGITAL_SKU }]),
    "Adicional ao livro físico",
  );
  assert.equal(ebookOriginLabel([{ sku: PHYSICAL_SKU }]), null);
});

test("entrega digital ausente não é tratada como falha", () => {
  assert.deepEqual(digitalDeliveryCopy("pending", null), {
    delivery: "Não iniciada",
    provider: "—",
  });
  assert.equal(digitalDeliveryCopy("pending", null).delivery.includes("Falha"), false);
  assert.deepEqual(digitalDeliveryCopy("approved", null), {
    delivery: "Não registrada",
    provider: "—",
  });
  assert.deepEqual(
    digitalDeliveryCopy("approved", {
      emailStatus: "pending",
      providerAcceptedAt: "2026-09-10T15:05:00.000Z",
      revokedAt: null,
      createdAt: "2026-09-10T15:05:00.000Z",
    }),
    { delivery: "Pendente", provider: "Aceito" },
  );
  assert.equal(
    digitalDeliveryCopy("approved", {
      emailStatus: "failed",
      providerAcceptedAt: null,
      revokedAt: null,
      createdAt: "2026-09-10T15:05:00.000Z",
    }).delivery,
    "Falha no e-mail",
  );
});

test("histórico não inventa logística e não repete segredo do metadata", () => {
  assert.equal(eventLabel("payment_reconciled"), "Pagamento reconciliado");
  assert.equal(eventLabel("shipment_invented"), "shipment_invented");
  const detail = eventDetail({
    method: "pix",
    payment_status: "approved",
    token_hash: "segredo",
    digital_file_path: "privado.pdf",
    provider_order_id: "ORD-1",
  });
  assert.equal(detail, "Pix · Pago");
  assert.equal(detail?.includes("segredo"), false);
  assert.equal(detail?.includes("privado.pdf"), false);
  assert.equal(detail?.includes("ORD-1"), false);
});

test("detalhe de físico com e-book mostra endereço e omite rastreio vazio", () => {
  const screen = toOrderScreen(
    record({
      items: [
        {
          sku: PHYSICAL_SKU,
          title: "Livro",
          quantity: 2,
          unitPriceCents: 3990,
          totalPriceCents: 7980,
        },
        {
          sku: DIGITAL_SKU,
          title: "E-book",
          quantity: 1,
          unitPriceCents: 1990,
          totalPriceCents: 1990,
        },
      ],
      payments: [
        {
          id: "00000000-0000-4000-8000-000000000099",
          method: "pix",
          status: "in_process",
          statusDetail: null,
          installments: 1,
          amountCents: 6490,
          providerPaymentId: "pay-1",
          providerOrderId: "ord-1",
          createdAt: "2026-09-10T15:01:00.000Z",
        },
      ],
    }),
    "#A1B2C3D4",
  );

  assert.equal(screen.address?.street, "Rua da Consolação");
  assert.equal(screen.logistics?.status, "pending");
  assert.equal(screen.logistics?.trackingCode, null);
  assert.equal(screen.logistics?.shippedAt, null);
  assert.equal("carrier" in (screen.logistics ?? {}), false);
  assert.equal(screen.digital?.delivery, "Não registrada");
  assert.equal(screen.paymentStatus, "approved");
  assert.equal(screen.payments[0]?.statusLabel, "Em processamento");
  assert.equal(JSON.stringify(screen).includes("token_hash"), false);
});

test("detalhe de e-book avulso não mostra endereço nem logística física", () => {
  const screen = toOrderScreen(
    record({
      paymentStatus: "pending",
      paidAt: null,
      items: [
        {
          sku: DIGITAL_SKU,
          title: "E-book",
          quantity: 1,
          unitPriceCents: 1990,
          totalPriceCents: 1990,
        },
      ],
      zip: null,
      street: null,
    }),
    "#A1B2C3D4",
  );

  assert.equal(screen.address, null);
  assert.equal(screen.logistics, null);
  assert.equal(screen.fulfillmentStatus, null);
  assert.equal(screen.digital?.delivery, "Não iniciada");
});

test("rotas de lista reaproveitam os mesmos caminhos", () => {
  assert.equal(physicalListPath("all"), "/admin/pedidos/fisicos");
  assert.equal(physicalListPath("awaiting"), "/admin/logistica/aguardando-envio");
  assert.equal(physicalListPath("shipped"), "/admin/logistica/postados");
  assert.equal(physicalListPath("delivered"), "/admin/logistica/entregues");
  assert.equal(paymentListPath("pending"), "/admin/pagamentos/aguardando");
  assert.equal(paymentListPath("declined"), "/admin/pagamentos/recusados-cancelados");
  assert.equal(paymentListPath("refunded"), "/admin/pagamentos/reembolsados");
  assert.equal(withPage("/admin/pedidos/fisicos", 1), "/admin/pedidos/fisicos");
  assert.equal(withPage("/admin/pedidos/fisicos", 2), "/admin/pedidos/fisicos?page=2");
  assert.equal(catalogListHref(2, "both", "approved"), "/admin/pedidos?tipo=ambos&pagamento=approved&page=2");
});

test("rotas novas exigem a allowlist e a logística não duplica a consulta", () => {
  const pages = [
    "app/admin/(protected)/page.tsx",
    "app/admin/(protected)/pedidos/page.tsx",
    "app/admin/(protected)/pedidos/fisicos/page.tsx",
    "app/admin/(protected)/pedidos/ebooks/page.tsx",
    "app/admin/(protected)/pedidos/[id]/page.tsx",
    "app/admin/(protected)/logistica/aguardando-envio/page.tsx",
    "app/admin/(protected)/logistica/postados/page.tsx",
    "app/admin/(protected)/logistica/entregues/page.tsx",
    "app/admin/(protected)/pagamentos/page.tsx",
    "app/admin/(protected)/pagamentos/aguardando/page.tsx",
    "app/admin/(protected)/pagamentos/aprovados/page.tsx",
    "app/admin/(protected)/pagamentos/recusados/page.tsx",
    "app/admin/(protected)/pagamentos/cancelados/page.tsx",
    "app/admin/(protected)/pagamentos/reembolsados/page.tsx",
    "app/admin/(protected)/pagamentos/recusados-cancelados/page.tsx",
    "app/admin/(protected)/layout.tsx",
  ];

  for (const page of pages) {
    const source = readFileSync(join(process.cwd(), page), "utf8");
    assert.equal(
      source.includes("requireAdminPage") || source.includes("resolveAdminAccess"),
      true,
      page,
    );
    assert.equal(source.includes("token_hash"), false, page);
  }

  for (const page of [
    "app/admin/(protected)/logistica/aguardando-envio/page.tsx",
    "app/admin/(protected)/logistica/postados/page.tsx",
    "app/admin/(protected)/logistica/entregues/page.tsx",
    "app/admin/(protected)/pedidos/fisicos/page.tsx",
  ]) {
    const source = readFileSync(join(process.cwd(), page), "utf8");
    assert.equal(source.includes("PhysicalOrdersView"), true, page);
    assert.equal(source.includes(".from("), false, page);
  }
});
