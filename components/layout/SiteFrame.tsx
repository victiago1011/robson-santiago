"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import Header from "@/components/layout/Header";

export default function SiteFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const admin = pathname === "/admin" || pathname.startsWith("/admin/");

  return (
    <>
      {admin ? null : <Header />}
      {children}
    </>
  );
}
