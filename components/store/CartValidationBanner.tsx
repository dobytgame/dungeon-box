import type { CartValidationIssue } from '@/lib/store/cart-validation';

interface Props {
  issues: CartValidationIssue[];
}

export default function CartValidationBanner({ issues }: Props) {
  if (issues.length === 0) return null;

  return (
    <div
      className="rounded-sm border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
      role="alert"
    >
      <p className="font-display text-xs uppercase tracking-widest text-amber-200/90">
        Ajuste as quantidades
      </p>
      <ul className="mt-2 space-y-1.5 text-amber-50/90">
        {issues.map((issue) => (
          <li key={`${issue.productId}-${issue.error}`}>{issue.error}</li>
        ))}
      </ul>
    </div>
  );
}
