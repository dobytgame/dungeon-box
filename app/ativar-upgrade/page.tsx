import type { Metadata } from 'next';
import UpgradeActivationLinkClient from '@/components/checkout/UpgradeActivationLinkClient';
import { loadUpgradePaymentLinkPreview } from '@/lib/subscriptions/upgrade-payment-link';
import { createAdminClient } from '@/lib/supabase/admin';

export const metadata: Metadata = {
  title: 'Ativar upgrade',
  description: 'Informe o cartão para quitar o atraso e ativar o novo plano da DungeonBox.',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

interface Props {
  searchParams: Promise<{ token?: string }>;
}

export default async function ActivateUpgradePage({ searchParams }: Props) {
  const { token } = await searchParams;
  const preview = await loadUpgradePaymentLinkPreview(createAdminClient(), token);
  return <UpgradeActivationLinkClient preview={preview} />;
}
