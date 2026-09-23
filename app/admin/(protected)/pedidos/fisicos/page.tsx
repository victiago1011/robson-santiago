import type { Metadata } from "next";
import { PhysicalOrdersView } from "@/components/admin/PhysicalOrdersView";
import { requireAdminPage } from "@/lib/admin/guard";
import { parseAdminPage } from "@/lib/admin/orders";
import { firstSearchParam } from "@/lib/admin/search-params";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Livros físicos",
};

type PageProps = {
  searchParams: Promise<{ page?: string | string[] }>;
};

export default async function PhysicalOrdersPage({ searchParams }: PageProps) {
  if (!(await requireAdminPage())) {
    return null;
  }
  const params = await searchParams;
  return <PhysicalOrdersView filter="all" page={parseAdminPage(firstSearchParam(params.page))} />;
}
