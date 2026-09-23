import type { Metadata } from "next";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AdminFrame, AdminMessage } from "@/components/admin/AdminChrome";
import { deriveMetrics, navCounts, type NavCounts } from "@/lib/admin/catalog";
import { resolveAdminAccess } from "@/lib/admin/guard";
import { loadAdminOrderFacts } from "@/lib/admin/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    default: "Admin — Robson Santiago",
    template: "%s — Admin — Robson Santiago",
  },
  robots: { index: false, follow: false },
};

export default async function AdminProtectedLayout({ children }: { children: ReactNode }) {
  const access = await resolveAdminAccess();

  if (!access.ok && access.reason === "anonymous") {
    redirect("/admin/login");
  }

  if (!access.ok && access.reason === "unavailable") {
    return (
      <AdminMessage
        title="Admin indisponível"
        body="Não foi possível confirmar o acesso agora."
      />
    );
  }

  if (!access.ok) {
    return (
      <AdminMessage
        title="Acesso não autorizado"
        body="Esta conta não pode ver os pedidos."
        showSignOut
      />
    );
  }

  let counts: NavCounts | null = null;
  const facts = await loadAdminOrderFacts();
  if (facts) {
    counts = navCounts(deriveMetrics(facts));
  }

  return <AdminFrame counts={counts}>{children}</AdminFrame>;
}
