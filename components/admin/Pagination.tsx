import Link from "next/link";

export function AdminPagination({
  page,
  pageCount,
  hrefFor,
}: {
  page: number;
  pageCount: number;
  hrefFor: (page: number) => string;
}) {
  if (pageCount <= 1) {
    return null;
  }

  return (
    <nav className="mt-6 flex items-center justify-between gap-4 font-sans text-sm text-ink">
      {page > 1 ? (
        <Link
          href={hrefFor(page - 1)}
          className="inline-flex min-h-11 items-center underline-offset-4 hover:underline focus-visible:outline-none focus-visible:underline"
        >
          Anterior
        </Link>
      ) : (
        <span />
      )}
      <p className="text-ink-soft">
        Página {page} de {pageCount}
      </p>
      {page < pageCount ? (
        <Link
          href={hrefFor(page + 1)}
          className="inline-flex min-h-11 items-center underline-offset-4 hover:underline focus-visible:outline-none focus-visible:underline"
        >
          Próxima
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
