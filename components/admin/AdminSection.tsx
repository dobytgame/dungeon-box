import Link from 'next/link';

interface Props {
  title: string;
  action?: { href: string; label: string };
  children: React.ReactNode;
  className?: string;
}

export default function AdminSection({
  title,
  action,
  children,
  className = '',
}: Props) {
  return (
    <section className={className}>
      <div className="admin-panel flex items-center justify-between gap-4 rounded px-4 py-2.5">
        <h2 className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-400">
          {title}
        </h2>
        {action ? (
          <Link
            href={action.href}
            className="font-mono text-[10px] uppercase tracking-[0.16em] text-console transition hover:text-console-muted"
          >
            {action.label} →
          </Link>
        ) : null}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}
