import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { AdminLoadError } from "@/components/admin/AdminChrome";
import { OrderDetail } from "@/components/admin/OrderDetail";
import { requireAdminPage } from "@/lib/admin/guard";
import { friendlyOrderCode } from "@/lib/admin/orders";
import { toOrderScreen } from "@/lib/admin/order-screen";
import { findAdminOrder } from "@/lib/admin/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pedido",
};

type AdminOrderDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminOrderDetailPage({ params }: AdminOrderDetailPageProps) {
  if (!(await requireAdminPage())) {
    return null;
  }

  const { id } = await params;
  if (!z.uuid().safeParse(id).success) {
    notFound();
  }

  const result = await findAdminOrder(id);
  if (!result.ok && result.reason === "missing") {
    notFound();
  }
  if (!result.ok) {
    return <AdminLoadError />;
  }

  return <OrderDetail order={toOrderScreen(result.order, friendlyOrderCode(result.order.publicId))} />;
}
