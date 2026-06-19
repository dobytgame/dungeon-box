import Link from 'next/link';

interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  className?: string;
}

interface Props<T> {
  columns: Column<T>[];
  rows: T[];
  emptyMessage?: string;
  getRowHref?: (row: T) => string;
  onRowClick?: (row: T) => void;
}

export default function AdminTable<T extends { id: string }>({
  columns,
  rows,
  emptyMessage = 'Nenhum registro encontrado.',
  getRowHref,
  onRowClick,
}: Props<T>) {
  if (rows.length === 0) {
    return (
      <p className="admin-panel rounded px-4 py-10 text-center font-mono text-xs text-zinc-600">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="admin-panel overflow-x-auto rounded">
      <table className="min-w-full text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-800/90 bg-zinc-900/50">
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={`px-4 py-2.5 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-500 ${column.className ?? ''}`}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800/60">
          {rows.map((row, rowIndex) => {
            const rowClassName = `transition hover:bg-console/[0.04] ${rowIndex % 2 === 1 ? 'bg-zinc-900/20' : ''}`;

            if (onRowClick) {
              return (
                <tr
                  key={row.id}
                  className={`${rowClassName} cursor-pointer`}
                  onClick={() => onRowClick(row)}
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={`px-4 py-2.5 text-zinc-300 ${column.className ?? ''}`}
                    >
                      {column.cell(row)}
                    </td>
                  ))}
                </tr>
              );
            }

            if (getRowHref) {
              return (
                <tr
                  key={row.id}
                  className={`transition hover:bg-console/[0.04] ${rowIndex % 2 === 1 ? 'bg-zinc-900/20' : ''}`}
                >
                  {columns.map((column, index) => (
                    <td
                      key={column.key}
                      className={`px-4 py-2.5 text-zinc-300 ${column.className ?? ''}`}
                    >
                      {index === 0 ? (
                        <Link
                          href={getRowHref(row)}
                          className="block text-zinc-200 hover:text-console"
                        >
                          {column.cell(row)}
                        </Link>
                      ) : (
                        column.cell(row)
                      )}
                    </td>
                  ))}
                </tr>
              );
            }

            return (
              <tr
                key={row.id}
                className={`${rowIndex % 2 === 1 ? 'bg-zinc-900/20' : ''}`}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`px-4 py-2.5 text-zinc-300 ${column.className ?? ''}`}
                  >
                    {column.cell(row)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
