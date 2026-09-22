"use client";

import { useActionState } from "react";
import { signInAdmin, type AdminLoginState } from "@/lib/admin/actions";

const initialState: AdminLoginState = { error: null };

const inputClassName =
  "mt-2 w-full min-h-12 rounded-lg border border-rule bg-white px-4 font-sans text-base text-ink focus-visible:border-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20";

export default function LoginForm() {
  const [state, action, pending] = useActionState(signInAdmin, initialState);

  return (
    <form action={action} className="mt-10 space-y-5" noValidate>
      <div>
        <label
          htmlFor="admin-email"
          className="font-sans text-[0.7rem] font-medium tracking-[0.18em] text-ink uppercase"
        >
          E-mail
        </label>
        <input
          id="admin-email"
          name="email"
          type="email"
          autoComplete="username"
          required
          className={inputClassName}
        />
      </div>
      <div>
        <label
          htmlFor="admin-password"
          className="font-sans text-[0.7rem] font-medium tracking-[0.18em] text-ink uppercase"
        >
          Senha
        </label>
        <input
          id="admin-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={inputClassName}
        />
      </div>
      <p role="alert" className="min-h-5 font-sans text-sm text-[#8f2d2d]">
        {state.error ?? ""}
      </p>
      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-ink px-5 font-sans text-sm font-medium tracking-[0.14em] text-paper-strong uppercase hover:bg-ink/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40 disabled:cursor-wait disabled:opacity-60"
      >
        {pending ? "Entrando" : "Entrar"}
      </button>
    </form>
  );
}
