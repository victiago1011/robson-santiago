import Link from "next/link";
import type { ReactNode } from "react";
import { AdminNav } from "@/components/admin/AdminNav";
import { signOutAdmin } from "@/lib/admin/actions";
import type { NavCounts } from "@/lib/admin/catalog";

export function AdminFrame({
  children,
  counts,
}: {
  children: ReactNode;
  counts: NavCounts | null;
}) {
  return (
    <div className="min-h-dvh flex-1 bg-paper text-ink">
      <AdminNav counts={counts} />
      <div className="min-w-0 md:pl-64">
        <main className="mx-auto w-full max-w-6xl overflow-x-clip px-4 py-6 sm:px-6 md:px-8 md:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}

export function AdminLoadError() {
  return (
    <p className="font-sans text-base text-ink-soft">Não foi possível carregar os pedidos agora.</p>
  );
}

export function AdminPageHeader({
  title,
  description,
  meta,
}: {
  title: string;
  description?: string;
  meta?: string;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="font-display text-3xl tracking-tight text-ink md:text-4xl">{title}</h1>
        {description ? (
          <p className="mt-2 max-w-2xl font-sans text-sm leading-relaxed text-ink-soft">{description}</p>
        ) : null}
      </div>
      {meta ? <p className="font-sans text-sm text-ink-soft">{meta}</p> : null}
    </div>
  );
}

export function AdminMessage({
  title,
  body,
  showSignOut = false,
}: {
  title: string;
  body: string;
  showSignOut?: boolean;
}) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-paper text-ink">
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-6 py-16">
        <p className="font-sans text-[0.7rem] font-medium tracking-[0.22em] text-ink-soft uppercase">
          Admin
        </p>
        <h1 className="mt-3 font-display text-4xl tracking-tight text-ink">{title}</h1>
        <p className="mt-4 font-sans text-base leading-relaxed text-ink-soft">{body}</p>
        {showSignOut ? (
          <form action={signOutAdmin} className="mt-8">
            <button
              type="submit"
              className="inline-flex min-h-11 items-center font-sans text-sm text-ink underline-offset-4 hover:underline focus-visible:outline-none focus-visible:underline"
            >
              Sair
            </button>
          </form>
        ) : (
          <Link
            href="/admin/login"
            className="mt-8 inline-flex min-h-11 items-center font-sans text-sm text-ink underline-offset-4 hover:underline focus-visible:outline-none focus-visible:underline"
          >
            Ir para o login
          </Link>
        )}
      </main>
    </div>
  );
}
