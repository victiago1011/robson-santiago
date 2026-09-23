import type { Metadata } from "next";
import { PaymentsView } from "@/components/admin/PaymentsView";
import { requireAdminPage } from "@/lib/admin/guard";
import { parseAdminPage } from "@/lib/admin/orders";
import { firstSearchParam } from "@/lib/admin/search-params";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Recusados",
};

type PageProps = {
  searchParams: Promise<{ page?: string | string[] }>;
};

export default async function RejectedPaymentsPage({ searchParams }: PageProps) {
  if (!(await requireAdminPage())) {
    return null;
  }
  const params = await searchParams;
  return <PaymentsView filter="rejected" page={parseAdminPage(firstSearchParam(params.page))} />;
}
