import { z } from "zod";
import type { AdminAccess } from "@/lib/admin/access";
import {
  ADMIN_ORDERS_PAGE_SIZE,
  parseAdminPage,
  type AdminOrderDetail,
  type AdminOrderListItem,
} from "@/lib/admin/orders";

export type AdminOrderListResult = {
  total: number;
  page: number;
  pageSize: number;
  orders: AdminOrderListItem[];
};

type AdminOrdersDeps = {
  resolveAccess: () => Promise<AdminAccess>;
  listPhysicalOrders: (page: number) => Promise<AdminOrderListResult>;
  findPhysicalOrder: (id: string) => Promise<AdminOrderDetail | null>;
};

function accessDenied(access: AdminAccess): Response | null {
  if (access.ok) {
    return null;
  }
  if (access.reason === "anonymous") {
    return Response.json({ ok: false, code: "UNAUTHENTICATED" }, { status: 401 });
  }
  if (access.reason === "forbidden") {
    return Response.json({ ok: false, code: "FORBIDDEN" }, { status: 403 });
  }
  return Response.json({ ok: false, code: "UNAVAILABLE" }, { status: 503 });
}

export async function handleAdminOrderList(
  request: Request,
  deps: Pick<AdminOrdersDeps, "resolveAccess" | "listPhysicalOrders">,
): Promise<Response> {
  const access = await deps.resolveAccess();
  const denied = accessDenied(access);
  if (denied) {
    return denied;
  }

  const page = parseAdminPage(new URL(request.url).searchParams.get("page") ?? undefined);
  try {
    const result = await deps.listPhysicalOrders(page);
    return Response.json({
      ok: true,
      page: result.page,
      pageSize: result.pageSize,
      total: result.total,
      orders: result.orders,
    });
  } catch {
    return Response.json({ ok: false, code: "UNAVAILABLE" }, { status: 503 });
  }
}

export async function handleAdminOrderDetail(
  id: string,
  deps: Pick<AdminOrdersDeps, "resolveAccess" | "findPhysicalOrder">,
): Promise<Response> {
  const access = await deps.resolveAccess();
  const denied = accessDenied(access);
  if (denied) {
    return denied;
  }

  if (!z.uuid().safeParse(id).success) {
    return Response.json({ ok: false, code: "VALIDATION_ERROR" }, { status: 400 });
  }

  try {
    const order = await deps.findPhysicalOrder(id);
    if (!order) {
      return Response.json({ ok: false, code: "NOT_FOUND" }, { status: 404 });
    }
    return Response.json({ ok: true, order });
  } catch {
    return Response.json({ ok: false, code: "UNAVAILABLE" }, { status: 503 });
  }
}

export { ADMIN_ORDERS_PAGE_SIZE };
