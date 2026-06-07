import type { Metadata } from 'next';
import LegalDocumentView from '@/components/legal/LegalDocumentView';
import LegalPageShell from '@/components/legal/LegalPageShell';
import { LEGAL_DOCUMENT_VERSION, LEGAL_LAST_UPDATED } from '@/lib/legal/constants';
import { privacidadeDocument } from '@/lib/legal/privacidade';

export const metadata: Metadata = {
  title: 'Política de Privacidade — DungeonBox',
  description:
    'Como a DungeonBox trata seus dados pessoais, cookies e direitos sob a LGPD.',
  robots: { index: true, follow: true },
};

export default function PrivacidadePage() {
  return (
    <LegalPageShell>
      <LegalDocumentView
        document={privacidadeDocument}
        lastUpdated={LEGAL_LAST_UPDATED}
        version={LEGAL_DOCUMENT_VERSION}
      />
    </LegalPageShell>
  );
}
