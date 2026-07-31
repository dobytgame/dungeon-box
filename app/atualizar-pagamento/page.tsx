import UpdatePaymentClient from '@/components/checkout/UpdatePaymentClient';

interface Props {
  searchParams: Promise<{ token?: string }>;
}

export default async function UpdatePaymentPage({ searchParams }: Props) {
  const { token } = await searchParams;

  return (
    <main className="min-h-screen bg-stone-950 px-4 py-16">
      <UpdatePaymentClient token={token?.trim() ?? null} />
    </main>
  );
}
