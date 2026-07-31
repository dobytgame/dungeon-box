import Link from 'next/link';
import type { CartValidationIssue } from '@/lib/store/cart-validation';

interface Props {
  issues: CartValidationIssue[];
}

function bannerTitle(issues: CartValidationIssue[]): string {
  const hasUploads = issues.some((issue) => issue.kind === 'personalized_upload');
  const hasQuantity = issues.some(
    (issue) => issue.kind === 'quantity' || issue.kind === 'variety_pool'
  );

  if (hasUploads && hasQuantity) return 'Ajuste o carrinho para continuar';
  if (hasUploads) return 'Complete a personalização';
  return 'Ajuste as quantidades';
}

export default function CartValidationBanner({ issues }: Props) {
  if (issues.length === 0) return null;

  return (
    <div
      className="rounded-sm border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
      role="alert"
    >
      <p className="font-display text-xs uppercase tracking-widest text-amber-200/90">
        {bannerTitle(issues)}
      </p>
      <ul className="mt-2 space-y-2 text-amber-50/90">
        {issues.map((issue) => (
          <li key={`${issue.productId}-${issue.error}`}>
            <p>{issue.error}</p>
            {issue.actionHref && issue.actionLabel ? (
              <Link
                href={issue.actionHref}
                className="mt-1 inline-flex font-display text-[11px] uppercase tracking-widest text-ember hover:text-ember-bright"
              >
                {issue.actionLabel} →
              </Link>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
