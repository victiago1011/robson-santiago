import type { Metadata } from "next";
import LoginForm from "@/components/admin/LoginForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Entrar — Admin — Robson Santiago",
  robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
  return (
    <main className="flex flex-1 flex-col bg-paper text-ink">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-16">
        <p className="font-sans text-[0.7rem] font-medium tracking-[0.22em] text-ink-soft uppercase">
          Robson Santiago
        </p>
        <h1 className="mt-3 font-display text-4xl tracking-tight text-ink">Admin</h1>
        <p className="mt-3 font-sans text-sm leading-relaxed text-ink-soft">
          Acesso restrito à operação dos pedidos do livro.
        </p>
        <LoginForm />
      </div>
    </main>
  );
}
