import type { Metadata } from 'next';
import LegalDocumentView from '@/components/legal/LegalDocumentView';
import LegalPageShell from '@/components/legal/LegalPageShell';
import { LEGAL_DOCUMENT_VERSION, LEGAL_LAST_UPDATED } from '@/lib/legal/constants';
import { privacidadeDocument } from '@/lib/legal/privacidade';
import {
  buildOpenGraph,
  buildRobots,
  buildTwitterCard,
} from '@/lib/seo/metadata';
import { absoluteUrl } from '@/lib/seo/site';

const title = 'Política de Privacidade';
const description =
  'Como a DungeonBox trata seus dados pessoais, cookies e direitos sob a LGPD.';

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: absoluteUrl('/privacidade') },
  robots: buildRobots(true),
  openGraph: buildOpenGraph({ title, description, path: '/privacidade' }),
  twitter: buildTwitterCard({ title, description }),
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
