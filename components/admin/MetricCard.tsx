import Link from "next/link";

export function MetricCard({
  label,
  value,
  href,
  tone = "default",
}: {
  label: string;
  value: string;
  href?: string;
  tone?: "default" | "inverse" | "alert";
}) {
  const className =
    tone === "inverse"
      ? "bg-ink text-paper"
      : tone === "alert"
        ? "border border-ink bg-paper-strong text-ink"
        : "border border-rule bg-paper-strong text-ink shadow-[0_1px_2px_rgba(20,20,20,0.04)]";

  const body = (
    <>
      <p
        className={`font-sans text-[0.68rem] tracking-[0.16em] uppercase ${tone === "inverse" ? "text-paper/70" : "text-ink-soft"}`}
      >
        {label}
      </p>
      <p
        className={`mt-3 text-3xl tracking-tight tabular-nums ${tone === "inverse" ? "font-display text-4xl" : "font-sans"}`}
      >
        {value}
      </p>
    </>
  );

  if (!href) {
    return <article className={`block p-5 ${className}`}>{body}</article>;
  }

  return (
    <Link
      href={href}
      className={`block p-5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${className}`}
    >
      {body}
    </Link>
  );
}
