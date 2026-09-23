"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { signOutAdmin } from "@/lib/admin/actions";
import type { NavCounts } from "@/lib/admin/catalog";
import { paymentListPath, physicalListPath } from "@/lib/admin/paths";

type NavItem = {
  href: string;
  label: string;
  exact?: boolean;
  badge?: number;
};

function isCurrent(pathname: string, item: NavItem): boolean {
  if (item.exact) {
    return pathname === item.href;
  }
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function NavLinks({
  counts,
  pathname,
  onNavigate,
}: {
  counts: NavCounts | null;
  pathname: string;
  onNavigate?: () => void;
}) {
  const sections: { label: string; items: NavItem[] }[] = [
    {
      label: "Principal",
      items: [{ href: "/admin", label: "Visão geral", exact: true }],
    },
    {
      label: "Pedidos",
      items: [
        { href: "/admin/pedidos", label: "Todos os pedidos", exact: true },
        { href: "/admin/pedidos/fisicos", label: "Livros físicos", exact: true },
        { href: "/admin/pedidos/ebooks", label: "E-books", exact: true },
      ],
    },
    {
      label: "Logística",
      items: [
        {
          href: physicalListPath("awaiting"),
          label: "Aguardando envio",
          exact: true,
          badge: counts?.awaitingShipment,
        },
        { href: physicalListPath("shipped"), label: "Postados", exact: true },
        { href: physicalListPath("delivered"), label: "Entregues", exact: true },
      ],
    },
    {
      label: "Pagamentos",
      items: [
        {
          href: paymentListPath("pending"),
          label: "Aguardando pagamento",
          exact: true,
          badge: counts?.pendingPayments,
        },
        {
          href: paymentListPath("declined"),
          label: "Recusados / cancelados",
          exact: true,
          badge: counts?.declinedPayments,
        },
      ],
    },
  ];

  return (
    <>
      <div className="px-5 pt-6 pb-4">
        <p className="font-sans text-[0.68rem] tracking-[0.22em] text-paper/60 uppercase">
          Robson Santiago
        </p>
        <p className="mt-1 font-sans text-sm tracking-[0.18em] text-paper uppercase">Admin</p>
      </div>
      <nav aria-label="Admin" className="flex-1 space-y-6 overflow-y-auto px-3 pb-4">
        {sections.map((section) => (
          <div key={section.label}>
            <p className="px-2 font-sans text-[0.65rem] tracking-[0.16em] text-paper/45 uppercase">
              {section.label}
            </p>
            <ul className="mt-2 space-y-1">
              {section.items.map((item) => {
                const active = isCurrent(pathname, item);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      onClick={onNavigate}
                      className={`flex min-h-11 items-center justify-between gap-3 px-2 font-sans text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper ${
                        active ? "bg-paper text-ink" : "text-paper/80 hover:bg-white/10 hover:text-paper"
                      }`}
                    >
                      <span>{item.label}</span>
                      {item.badge !== undefined ? (
                        <span
                          className={`min-w-6 px-1.5 text-center font-sans text-xs tabular-nums ${
                            active ? "bg-ink text-paper" : "bg-paper text-ink"
                          }`}
                        >
                          {item.badge}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <form action={signOutAdmin} className="border-t border-white/10 px-3 py-4">
        <button
          type="submit"
          className="flex min-h-11 w-full items-center px-2 font-sans text-sm text-paper/80 underline-offset-4 hover:text-paper hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper"
        >
          Sair
        </button>
      </form>
    </>
  );
}

export function AdminNav({ counts }: { counts: NavCounts | null }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) {
      return;
    }
    document.documentElement.classList.add("menu-open");
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.documentElement.classList.remove("menu-open");
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-white/10 bg-ink px-4 py-3 text-paper md:hidden">
        <div>
          <p className="font-sans text-[0.65rem] tracking-[0.2em] uppercase">Robson Santiago</p>
          <p className="mt-0.5 font-sans text-sm tracking-[0.16em] uppercase">Admin</p>
        </div>
        <button
          type="button"
          aria-expanded={open}
          aria-controls="admin-nav"
          className="inline-flex min-h-11 items-center px-2 font-sans text-sm"
          onClick={() => setOpen(true)}
        >
          Menu
        </button>
      </div>
      {open ? (
        <button
          type="button"
          aria-label="Fechar menu"
          className="fixed inset-0 z-30 bg-ink/50 md:hidden"
          onClick={() => setOpen(false)}
        />
      ) : null}
      <aside
        id="admin-nav"
        className={`${open ? "flex" : "hidden md:flex"} fixed inset-y-0 left-0 z-40 h-dvh w-64 max-w-[85vw] flex-col bg-ink text-paper md:fixed`}
      >
        <div className="flex justify-end px-3 py-2 md:hidden">
          <button
            type="button"
            className="inline-flex min-h-11 items-center px-2 font-sans text-sm text-paper"
            onClick={() => setOpen(false)}
          >
            Fechar
          </button>
        </div>
        <NavLinks counts={counts} pathname={pathname} onNavigate={() => setOpen(false)} />
      </aside>
    </>
  );
}
