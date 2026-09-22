import { handleAdminOrderDetail } from "@/lib/admin/http";
import { resolveAdminAccess } from "@/lib/admin/guard";
import { findPhysicalOrder } from "@/lib/admin/order-store";

export const dynamic = "force-dynamic";

type AdminOrderRouteProps = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: AdminOrderRouteProps) {
  const { id } = await params;
  return handleAdminOrderDetail(id, {
    resolveAccess: resolveAdminAccess,
    findPhysicalOrder,
  });
}
