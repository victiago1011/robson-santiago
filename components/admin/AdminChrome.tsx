import Link from "next/link";
import type { ReactNode } from "react";
import { signOutAdmin } from "@/lib/admin/actions";

export function AdminTopBar() {
  return (
    <header className="border-b border-rule">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-5 md:px-8">
        <div>
          <p className="font-sans text-[0.7rem] font-medium tracking-[0.22em] text-ink-soft uppercase">
            Robson Santiago
          </p>
          <p className="mt-1 font-display text-2xl tracking-tight text-ink">Pedidos</p>
        </div>
        <form action={signOutAdmin}>
          <button
            type="submit"
            className="inline-flex min-h-11 items-center font-sans text-[0.7rem] font-medium tracking-[0.16em] text-ink uppercase underline-offset-4 hover:underline focus-visible:outline-none focus-visible:underline"
          >
            Sair
          </button>
        </form>
      </div>
    </header>
  );
}

export function AdminFrame({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-paper text-ink">
      <AdminTopBar />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8 md:px-8 md:py-10">{children}</main>
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
