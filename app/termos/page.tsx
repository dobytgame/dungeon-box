import type { Metadata } from 'next';
import LegalDocumentView from '@/components/legal/LegalDocumentView';
import LegalPageShell from '@/components/legal/LegalPageShell';
import { LEGAL_DOCUMENT_VERSION, LEGAL_LAST_UPDATED } from '@/lib/legal/constants';
import { termosDocument } from '@/lib/legal/termos';
import {
  buildOpenGraph,
  buildRobots,
  buildTwitterCard,
} from '@/lib/seo/metadata';
import { absoluteUrl } from '@/lib/seo/site';

const title = 'Termos de Uso';
const description =
  'Termos da assinatura mensal DungeonBox: cobrança, entregas, cancelamento e uso do site.';

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: absoluteUrl('/termos') },
  robots: buildRobots(true),
  openGraph: buildOpenGraph({ title, description, path: '/termos' }),
  twitter: buildTwitterCard({ title, description }),
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
