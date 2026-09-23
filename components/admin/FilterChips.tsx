import Link from "next/link";

export function FilterChips({
  items,
}: {
  items: { href: string; label: string; active: boolean }[];
}) {
  return (
    <div className="mt-6 flex flex-wrap gap-2">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={item.active ? "page" : undefined}
          className={`inline-flex min-h-11 items-center px-3 font-sans text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${
            item.active ? "bg-ink text-paper" : "border border-rule bg-paper-strong text-ink"
          }`}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}
