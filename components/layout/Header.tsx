"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";

const navItems = [
  "Sobre",
  "Livro",
  "VEZ",
  "Reflexões",
  "Projetos",
  "Contato",
] as const;

const desktopQuery = "(min-width: 1024px)";

const menuButtonClassName =
  "inline-flex min-h-11 min-w-[4.5rem] cursor-pointer items-center justify-end border-0 bg-transparent p-0 font-sans text-[0.7rem] font-medium tracking-[0.16em] text-ink uppercase appearance-none focus-visible:outline-none focus-visible:underline";

function NavItems({ className }: { className: string }) {
  return (
    <ul className={className}>
      {navItems.map((item) => (
        <li key={item}>
          <span className="cursor-default">{item}</span>
        </li>
      ))}
    </ul>
  );
}

export default function Header() {
  const [open, setOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) {
      document.documentElement.classList.remove("menu-open");
      return;
    }

    document.documentElement.classList.add("menu-open");
    closeButtonRef.current?.focus();

    const overlay = overlayRef.current;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        return;
      }

      if (event.key !== "Tab" || !overlay) {
        return;
      }

      const focusable = overlay.querySelectorAll<HTMLElement>(
        "a[href], button:not([disabled])",
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (!first || !last) {
        return;
      }

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    const media = window.matchMedia(desktopQuery);
    const onViewportChange = (event: MediaQueryListEvent) => {
      if (event.matches) {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    media.addEventListener("change", onViewportChange);

    return () => {
      document.documentElement.classList.remove("menu-open");
      window.removeEventListener("keydown", onKeyDown);
      media.removeEventListener("change", onViewportChange);
    };
  }, [open]);

  return (
    <header className="relative z-20 border-b border-rule bg-paper">
      <div className="mx-auto flex h-16 max-w-[90rem] items-center justify-between px-6 md:px-8 lg:px-12 xl:px-16">
        <Link
          href="/"
          className="font-sans text-[0.7rem] font-medium tracking-[0.22em] text-ink uppercase"
        >
          Robson Santiago
        </Link>

        <div className="hidden lg:block" aria-hidden="true">
          <NavItems className="flex items-center gap-8 font-sans text-[0.7rem] tracking-[0.16em] text-ink uppercase" />
        </div>

        <button
          type="button"
          className={`lg:hidden ${menuButtonClassName}`}
          aria-expanded={open}
          aria-controls={menuId}
          aria-label="Abrir menu visual. As demais páginas ainda não estão disponíveis."
          onClick={() => setOpen(true)}
        >
          Menu
        </button>
      </div>

      {open ? (
        <div
          ref={overlayRef}
          id={menuId}
          className="menu-overlay fixed inset-0 z-50 flex flex-col bg-paper lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
        >
          <div className="flex h-16 shrink-0 items-center justify-between border-b border-rule px-6 md:px-8">
            <Link
              href="/"
              className="font-sans text-[0.7rem] font-medium tracking-[0.22em] text-ink uppercase"
              onClick={() => setOpen(false)}
            >
              Robson Santiago
            </Link>
            <button
              ref={closeButtonRef}
              type="button"
              className={menuButtonClassName}
              aria-label="Fechar menu"
              onClick={() => setOpen(false)}
            >
              Fechar
            </button>
          </div>

          <div
            className="flex flex-1 flex-col justify-center px-6 py-16 md:px-10"
            aria-hidden="true"
          >
            <NavItems className="flex flex-col gap-8 font-sans text-sm tracking-[0.22em] text-ink uppercase md:gap-10 md:text-base" />
          </div>
        </div>
      ) : null}
    </header>
  );
}
