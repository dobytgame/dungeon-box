import type { LegalTable } from '@/lib/legal/types';

function LegalTableView({ table }: { table: LegalTable }) {
  return (
    <div className="legal-table-wrap mt-4 overflow-x-auto">
      <table className="legal-table w-full min-w-[280px] border-collapse text-sm">
        <thead>
          <tr>
            {table.headers.map((header) => (
              <th
                key={header}
                className="border border-white/10 bg-white/[0.04] px-3 py-2 text-left font-display text-xs uppercase tracking-widest text-stone-300"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  className="border border-white/10 px-3 py-2 text-stone-400"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export { LegalTableView };
