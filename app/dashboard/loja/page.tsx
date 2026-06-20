import StoreProductCard from '@/components/store/StoreProductCard';
import StoreSubNav from '@/components/store/StoreSubNav';
import { STORE_PRODUCTS } from '@/lib/store/catalog';

export default function StorePage() {
  return (
    <div>
      <StoreSubNav />

      <p className="mb-8 max-w-2xl text-sm text-stone-400">
        Materiais extras para sua mesa de RPG. Kits de pintura para deixar suas
        peças prontas para jogo — assinantes podem receber junto com a próxima caixa
        sem custo de frete.
      </p>

      <div className="grid gap-6 md:grid-cols-2">
        {STORE_PRODUCTS.map((product) => (
          <StoreProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}
