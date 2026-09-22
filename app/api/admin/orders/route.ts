import { handleAdminOrderList } from "@/lib/admin/http";
import { resolveAdminAccess } from "@/lib/admin/guard";
import { listPhysicalOrders } from "@/lib/admin/order-store";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  return handleAdminOrderList(request, {
    resolveAccess: resolveAdminAccess,
    listPhysicalOrders,
  });
}
