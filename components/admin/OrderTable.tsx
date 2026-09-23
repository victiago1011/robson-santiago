import Link from "next/link";
import type { ReactNode } from "react";

export function OrderCodeLink({ id, code }: { id: string; code: string }) {
  return (
    <Link
      href={`/admin/pedidos/${id}`}
      className="font-medium tracking-wide underline-offset-4 hover:underline focus-visible:outline-none focus-visible:underline"
    >
      {code}
    </Link>
  );
}

export function OrderViewLink({ id }: { id: string }) {
  return (
    <Link
      href={`/admin/pedidos/${id}`}
      className="inline-flex min-h-11 items-center underline-offset-4 hover:underline focus-visible:outline-none focus-visible:underline"
    >
      Ver pedido
    </Link>
  );
}

export type AdminColumn<Row> = {
  key: string;
  header: string;
  cell: (row: Row) => ReactNode;
};

export function AdminDataList<Row extends { id: string }>({
  rows,
  columns,
  empty,
}: {
  rows: Row[];
  columns: AdminColumn<Row>[];
  empty: string;
}) {
  if (rows.length === 0) {
    return <p className="mt-10 font-sans text-base text-ink-soft">{empty}</p>;
  }

  return (
    <>
      <div className="mt-8 hidden border border-rule bg-paper-strong lg:block">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-rule font-sans text-[0.7rem] tracking-[0.14em] text-ink-soft uppercase">
              {columns.map((column) => (
                <th key={column.key} className="px-4 py-3 font-medium">
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-rule last:border-b-0">
                {columns.map((column) => (
                  <td key={column.key} className="px-4 py-4 align-top font-sans text-sm text-ink">
                    {column.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="mt-6 space-y-3 lg:hidden">
        {rows.map((row) => (
          <li key={row.id} className="border border-rule bg-paper-strong p-4">
            <dl className="space-y-3">
              {columns.map((column) => (
                <div key={column.key} className="min-w-0">
                  <dt className="font-sans text-[0.68rem] tracking-[0.14em] text-ink-soft uppercase">
                    {column.header}
                  </dt>
                  <dd className="mt-1 font-sans text-sm break-words text-ink">{column.cell(row)}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
    </>
  );
}
