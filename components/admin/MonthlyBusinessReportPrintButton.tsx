'use client';

export default function MonthlyBusinessReportPrintButton() {
  return (
    <button
      type="button"
      className="cursor-pointer rounded-sm border border-console/40 bg-console/10 px-4 py-2 font-display text-xs uppercase tracking-widest text-console transition hover:bg-console/20"
      onClick={() => {
        window.open('/api/admin/reports/monthly-business', '_blank');
      }}
    >
      Imprimir / PDF
    </button>
  );
}
