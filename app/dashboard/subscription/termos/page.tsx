import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import LegalDocumentView from '@/components/legal/LegalDocumentView';
import PurchaseTermsPrintHeader from '@/components/legal/PurchaseTermsPrintHeader';
import PurchaseTermsToolbar from '@/components/legal/PurchaseTermsToolbar';
import { requireDashboardUser } from '@/lib/dashboard/queries';
import {
  PURCHASE_TERMS_EFFECTIVE,
  PURCHASE_TERMS_VERSION,
  termosCompraDocument,
} from '@/lib/legal/termos-compra';
import { userHasActiveSubscriptionAccess } from '@/lib/subscriptions/active-access';

export const metadata: Metadata = {
  title: 'Termos e Condições de Compra',
  description:
    'Termos de compra da DungeonBox para assinantes: produção, entrega, garantia e suporte.',
  robots: { index: false, follow: false },
};

export default async function PurchaseTermsPage() {
  const { user, supabase } = await requireDashboardUser();
  const hasAccess = await userHasActiveSubscriptionAccess(supabase, user.id);

  if (!hasAccess) {
    redirect('/dashboard/subscription?terms=inactive');
  }

  const footerNote = `DungeonBox · Termos e Condições v${PURCHASE_TERMS_VERSION} · São Bernardo do Campo — SP · ${PURCHASE_TERMS_EFFECTIVE} · 57.205.373 DAIANA MARIA DA SILVA FARIAS · CNPJ 57.205.373/0001-16`;

  return (
    <div className="purchase-terms-print-root mx-auto max-w-3xl">
      <PurchaseTermsToolbar />
      <PurchaseTermsPrintHeader />
      <LegalDocumentView
        document={termosCompraDocument}
        lastUpdated={PURCHASE_TERMS_EFFECTIVE}
        version={PURCHASE_TERMS_VERSION}
        showRelatedLinks={false}
        footerNote={footerNote}
      />
    </div>
  );
}
