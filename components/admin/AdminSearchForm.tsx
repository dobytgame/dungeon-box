interface Props {
  placeholder?: string;
  defaultValue?: string;
  name?: string;
  children?: React.ReactNode;
}

export default function AdminSearchForm({
  placeholder = 'Buscar…',
  defaultValue = '',
  name = 'q',
  children,
}: Props) {
  return (
    <form
      className="admin-panel flex flex-wrap items-end gap-3 rounded p-4"
      method="get"
    >
      <div className="min-w-[220px] flex-1">
        <label htmlFor="admin-search" className="sr-only">
          Buscar
        </label>
        <input
          id="admin-search"
          name={name}
          defaultValue={defaultValue}
          placeholder={placeholder}
          className="w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-2 font-mono text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-console/40 focus:outline-none focus:ring-1 focus:ring-console/30"
        />
      </div>
      {children}
      <button
        type="submit"
        className="cursor-pointer rounded border border-console/30 bg-console/10 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-console transition hover:bg-console/15"
      >
        Filtrar
      </button>
    </form>
  );
}
