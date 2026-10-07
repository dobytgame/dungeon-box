import { requireAdmin } from '@/lib/admin/auth';
import { homeV2PreviewMetadata } from '@/lib/seo/metadata';
import './home-v2.css';

export const metadata = homeV2PreviewMetadata;

export default async function HomeV2Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin({ next: '/home-v2' });

  return (
    <div className="home-v2 font-body">
      <a
        href="#conteudo-principal"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[80] focus:bg-mesa-ember focus:px-4 focus:py-3 focus:font-homeBody focus:text-sm focus:font-semibold focus:text-mesa-ink"
      >
        Pular para o conteúdo
      </a>
      {children}
    </div>
  );
}
