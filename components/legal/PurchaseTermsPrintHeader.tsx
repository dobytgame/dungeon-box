import Image from 'next/image';
import {
  PURCHASE_TERMS_EFFECTIVE,
  PURCHASE_TERMS_VERSION,
} from '@/lib/legal/termos-compra';

export default function PurchaseTermsPrintHeader() {
  return (
    <header className="purchase-terms-print-header mb-8 hidden border-b border-stone-300 pb-6 print:block">
      <div className="flex items-start justify-between gap-6">
        <Image
          src="/images/dungeonbox.png"
          alt="DungeonBox"
          width={180}
          height={48}
          className="h-10 w-auto"
          priority
        />
        <div className="text-right text-xs leading-relaxed text-stone-600">
          <p className="font-display uppercase tracking-widest text-stone-800">
            Termos e Condições de Compra
          </p>
          <p className="mt-1">Versão {PURCHASE_TERMS_VERSION}</p>
          <p>Vigência: {PURCHASE_TERMS_EFFECTIVE}</p>
        </div>
      </div>
    </header>
  );
}
