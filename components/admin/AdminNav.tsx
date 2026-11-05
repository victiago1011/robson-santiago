"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { signOutAdmin } from "@/lib/admin/actions";

type IconName =
  | "grid" | "orders" | "book" | "ebook" | "globe" | "truck"
  | "package" | "check" | "clock" | "wallet" | "cancel" | "logout"
  | "menu" | "close" | "chevron" | "external";

function Icon({ name, className = "h-[18px] w-[18px]" }: { name: IconName; className?: string }) {
  const shapes: Record<IconName, ReactNode> = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
    orders: <><rect x="4" y="5" width="16" height="16" rx="2" /><path d="M8 5.5V3h8v2.5M8 10h8M8 14h8M8 18h5" /></>,
    book: <><path d="M12 6c-2.3-1.6-5-2-9-1v14c4-1 6.7-.6 9 1 2.3-1.6 5-2 9-1V5c-4-1-6.7-.6-9 1Z" /><path d="M12 6v14" /></>,
    ebook: <><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 7h6M9 11h6M10 17h4" /></>,
    globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c-3 3-3 15 0 18M12 3c3 3 3 15 0 18" /></>,
    truck: <><path d="M3 6h11v11H3zM14 10h4l3 4v3h-7" /><circle cx="7.5" cy="18" r="2" /><circle cx="17.5" cy="18" r="2" /></>,
    package: <><path d="m12 2 9 5-9 5-9-5 9-5ZM3 7v10l9 5 9-5V7M12 12v10M7.5 4.5l9 5" /></>,
    check: <><circle cx="12" cy="12" r="9" /><path d="m8 12 3 3 5-6" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" /></>,
    wallet: <><rect x="3" y="6" width="18" height="15" rx="2" /><path d="M3 10h18M6 6V4h12" /><path d="M16.5 15h2" /></>,
    cancel: <><circle cx="12" cy="12" r="9" /><path d="m9 9 6 6m0-6-6 6" /></>,
    logout: <><path d="M10 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h5M14 16l4-4-4-4M8 12h10" /></>,
    menu: <><path d="M4 7h16M4 12h16M4 17h16" /></>,
    close: <><path d="M5 5l14 14M19 5 5 19" /></>,
    chevron: <><path d="m6 9 6 6 6-6" /></>,
    external: <><path d="M13 5h6v6M19 5l-9 9M19 13v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5" /></>,
  };

  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      {shapes[name]}
    </svg>
  );
}

type NavItem = {
  href: string;
  label: string;
  icon: IconName;
  exact?: boolean;
  activeUnder?: string[];
};

type NavSection = {
  key: string;
  label: string;
  items: NavItem[];
};

function isCurrent(pathname: string, item: NavItem) {
  if (item.activeUnder?.some((prefix) => pathname === prefix || pathname.startsWith(prefix + "/"))) {
    return true;
  }
  return item.exact
    ? pathname === item.href
    : pathname === item.href || pathname.startsWith(item.href + "/");
}

function getSections(): NavSection[] {
  return [
    { key: "livro", label: "Livro", items: [
      { href: "/admin", label: "Visão geral", icon: "grid", exact: true },
      { href: "/admin/pedidos", label: "Pedidos", icon: "orders", exact: true },
      { href: "/admin/pedidos/fisicos", label: "Logística", icon: "truck", activeUnder: ["/admin/logistica"] },
      { href: "/admin/pagamentos", label: "Pagamentos", icon: "wallet" },
    ]},
    { key: "conteudos", label: "Conteúdos", items: [
      { href: "/admin/panorama", label: "Panorama 360°", icon: "globe" },
    ]},
  ];
}

function NavLinks({ pathname, onNavigate }: {
  pathname: string;
  onNavigate: () => void;
}) {
  const sections = getSections();
  const activeSection = sections.find((group) => group.items.some((item) => isCurrent(pathname, item)))?.key;
  const [expanded, setExpanded] = useState<string[]>(() => activeSection ? [activeSection] : ["livro"]);

  useEffect(() => {
    if (activeSection) {
      setExpanded((current) => current.includes(activeSection) ? current : [...current, activeSection]);
    }
  }, [activeSection]);

  return (
    <>
      <div className="shrink-0 border-b border-white/[0.09] px-5 pb-5 pt-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#bca16f]/30 bg-[#d6b77b]/10 font-display text-[1.2rem] tracking-[-0.05em] text-[#e2c791]">RS</div>
          <div className="min-w-0">
            <p className="truncate text-[0.82rem] font-semibold tracking-[0.095em] text-[#f2f4f6] uppercase">Robson Santiago</p>
            <p className="mt-0.5 text-xs tracking-[0.02em] text-[#9fb0bf]">Painel administrativo</p>
          </div>
        </div>
        <Link href="/" target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex min-h-9 items-center gap-2 rounded-lg px-2 text-xs font-medium text-[#b9c7d5] transition hover:bg-white/[0.07] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e2c791]">
          <Icon name="external" className="h-4 w-4" />
          Ver site público
        </Link>
      </div>

      <nav aria-label="Menu administrativo" className="admin-nav-scroll min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain px-3 py-5">
        {sections.map((section) => {
          const isExpanded = expanded.includes(section.key);
          const sectionActive = section.key === activeSection;
          return (
            <section key={section.key} aria-label={section.label}>
              <h2>
                <button
                  type="button"
                  aria-expanded={isExpanded}
                  aria-controls={"admin-nav-" + section.key}
                  onClick={() => setExpanded((current) => isExpanded ? current.filter((key) => key !== section.key) : [...current, section.key])}
                  className={"group flex min-h-9 w-full items-center justify-between rounded-lg px-3 text-left text-[0.69rem] font-bold tracking-[0.14em] uppercase transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e2c791] " +
                    (sectionActive ? "text-[#e0c28b]" : "text-[#8499aa] hover:bg-white/[0.05] hover:text-[#d7e0e8]")}
                >
                  <span>{section.label}</span>
                  <span className="flex items-center gap-2">
                    <Icon name="chevron" className={"h-3.5 w-3.5 transition-transform duration-200 " + (isExpanded ? "rotate-180" : "")} />
                  </span>
                </button>
              </h2>
              {isExpanded ? (
                <ul id={"admin-nav-" + section.key} className="mt-1 space-y-1 pb-2">
                  {section.items.map((item) => {
                    const active = isCurrent(pathname, item);
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={onNavigate}
                          aria-current={active ? "page" : undefined}
                          className={"group relative flex min-h-[44px] items-center gap-3 rounded-xl px-3 py-2 text-[0.83rem] font-medium leading-snug transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e2c791] " +
                            (active ? "bg-[#25445e] text-white shadow-[inset_0_0_0_1px_rgba(201,220,234,0.08)]" : "text-[#ccd7e1] hover:bg-white/[0.07] hover:text-white")}
                        >
                          {active ? <span aria-hidden="true" className="absolute bottom-2 left-0 top-2 w-[3px] rounded-r-full bg-[#e1bc79]" /> : null}
                          <Icon name={item.icon} className={"h-[18px] w-[18px] shrink-0 " + (active ? "text-[#e7c487]" : "text-[#8299ab] group-hover:text-[#d4c3a6]")} />
                          <span className="min-w-0 flex-1">{item.label}</span>

                        </Link>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </section>
          );
        })}
      </nav>

      <div className="shrink-0 border-t border-white/[0.09] bg-[#0b1724]/50 px-3 py-3">
        <form action={signOutAdmin}>
          <button type="submit" className="group flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-medium text-[#b8c9d7] transition hover:bg-white/[0.07] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e2c791]">
            <Icon name="logout" className="h-[18px] w-[18px] text-[#8fa5b7] group-hover:text-white" />
            Encerrar sessão
          </button>
        </form>
      </div>
    </>
  );
}

export function AdminNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  function closeMenu() {
    setOpen(false);
    menuTriggerRef.current?.focus();
  }

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    document.documentElement.classList.add("menu-open");
    closeButtonRef.current?.focus();

    function onKeydown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu();
      }
      if (event.key === "Tab") {
        const aside = document.getElementById("admin-nav");
        if (!aside) return;
        const focusables = Array.from(aside.querySelectorAll<HTMLElement>('a[href], button:not([disabled])'));
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (!first || !last) return;
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }

    window.addEventListener("keydown", onKeydown);
    return () => {
      document.documentElement.classList.remove("menu-open");
      window.removeEventListener("keydown", onKeydown);
    };
  }, [open]);

  return (
    <>
      <div className="sticky top-0 z-20 flex min-h-[66px] items-center justify-between border-b border-[#d8dedf] bg-[#f8f6f1] px-4 lg:hidden">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#10273a] font-display text-base text-[#e0c28b]">RS</div>
          <div>
            <p className="text-xs font-bold tracking-[0.1em] text-[#182c40] uppercase">Robson Santiago</p>
            <p className="text-[0.68rem] text-[#65768a]">Admin</p>
          </div>
        </div>
        <button
          ref={menuTriggerRef}
          type="button"
          aria-label="Abrir menu administrativo"
          aria-expanded={open}
          aria-controls="admin-nav"
          onClick={() => setOpen(true)}
          className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[#c9d2da] bg-white text-[#1f405a] focus-visible:outline-2 focus-visible:outline-[#a87828]"
        >
          <Icon name="menu" className="h-6 w-6" />
        </button>
      </div>
      {open ? (
        <button type="button" aria-label="Fechar menu administrativo" onClick={closeMenu} className="admin-sidebar-overlay fixed inset-0 z-30 cursor-default bg-[#071522]/65 backdrop-blur-[2px] lg:hidden" />
      ) : null}
      <aside
        id="admin-nav"
        aria-label="Barra lateral administrativa"
        className={(open ? "admin-sidebar-enter flex" : "hidden lg:flex") + " fixed inset-y-0 left-0 z-40 h-dvh w-72 max-w-[88vw] flex-col overflow-hidden border-r border-[#2a3f52] bg-[#101e2c] text-white shadow-2xl lg:shadow-none"}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-white/[0.08] px-5 py-2 lg:hidden">
          <span className="text-[0.66rem] font-semibold tracking-[0.15em] text-[#a4b7c7] uppercase">Navegação</span>
          <button ref={closeButtonRef} type="button" aria-label="Fechar menu" onClick={closeMenu} className="flex h-10 w-10 items-center justify-center rounded-lg text-[#b8c9d7] hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-[#e2c791]">
            <Icon name="close" className="h-5 w-5" />
          </button>
        </div>
        <NavLinks pathname={pathname} onNavigate={() => setOpen(false)} />
      </aside>
    </>
  );
}
