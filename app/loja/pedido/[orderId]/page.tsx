import StoreOrderPaymentResume from '@/components/store/StoreOrderPaymentResume';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface Props {
  params: Promise<{ orderId: string }>;
}

export default async function StoreOrderPaymentPage({ params }: Props) {
  const { orderId } = await params;
  const normalized = orderId.trim();

  if (!UUID_RE.test(normalized)) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <p className="text-sm text-stone-400">Pedido inválido.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <StoreOrderPaymentResume orderId={normalized} />
    </div>
  );
}
