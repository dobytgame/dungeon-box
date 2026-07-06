import Link from 'next/link';

export default function ShopPromoBar() {
  return (
    <div className="border-b border-ember/20 bg-ember/10 px-4 py-2.5 text-center text-sm text-stone-300">
      Assinantes ganham benefícios na loja —{' '}
      <Link href="/#planos" className="font-medium text-ember hover:underline">
        conheça os planos
      </Link>
    </div>
  );
}
