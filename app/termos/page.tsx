import type { Metadata } from 'next';
import LegalDocumentView from '@/components/legal/LegalDocumentView';
import LegalPageShell from '@/components/legal/LegalPageShell';
import { LEGAL_DOCUMENT_VERSION, LEGAL_LAST_UPDATED } from '@/lib/legal/constants';
import { termosDocument } from '@/lib/legal/termos';

export const metadata: Metadata = {
  title: 'Termos de Uso — DungeonBox',
  description:
    'Termos da assinatura mensal DungeonBox: cobrança, entregas, cancelamento e uso do site.',
  robots: { index: true, follow: true },
};

export default function TermosPage() {
  return (
    <LegalPageShell>
      <LegalDocumentView
        document={termosDocument}
        lastUpdated={LEGAL_LAST_UPDATED}
        version={LEGAL_DOCUMENT_VERSION}
      />
    </LegalPageShell>
  );
}
