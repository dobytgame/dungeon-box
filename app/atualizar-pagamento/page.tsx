import type { Metadata } from 'next';
import UpdatePaymentClient from '@/components/checkout/UpdatePaymentClient';
import { loadMigrationPreviewByToken } from '@/lib/pagarme/migration-preview';

export const metadata: Metadata = {
  title: 'Atualizar pagamento',
  description:
    'Confirme sua assinatura DungeonBox e atualize o cartão na nova plataforma de pagamentos.',
  robots: { index: false, follow: false },
};

interface Props {
  searchParams: Promise<{ token?: string }>;
}

export default async function UpdatePaymentPage({ searchParams }: Props) {
  const { token } = await searchParams;
  const preview = await loadMigrationPreviewByToken(token);

  return <UpdatePaymentClient preview={preview} />;
}
