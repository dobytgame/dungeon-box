import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function ShopPromoBar() {
  return (
    <div className="border-b border-white/10 bg-mesa-stone px-4 py-2 text-center text-[13px] text-mesa-ash">
      <Link
        href="/#planos"
        className="group inline-flex min-h-7 cursor-pointer items-center gap-2 transition-colors hover:text-mesa-parchment"
      >
        <span className="size-1.5 shrink-0 rounded-full bg-mesa-jade" aria-hidden="true" />
        <span>
          <span className="sm:hidden">Benefícios para assinantes — </span>
          <span className="hidden sm:inline">Assinantes ganham benefícios na loja — </span>
          <span className="font-semibold text-mesa-parchment">conheça os planos</span>
        </span>
        <ArrowRight
          aria-hidden="true"
          className="size-3.5 shrink-0 transition-transform duration-150 group-hover:translate-x-0.5"
        />
      </Link>
    </div>
  );
}
