import Link from 'next/link';
import { notFound } from 'next/navigation';
import ThemeForm from '@/components/admin/ThemeForm';
import { requireAdmin } from '@/lib/admin/auth';
import { getAdminTheme } from '@/lib/admin/queries';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AdminThemeDetailPage({ params }: Props) {
  const { id } = await params;
  const { admin } = await requireAdmin();
  const theme = await getAdminTheme(admin, id);

  if (!theme) notFound();

  return (
    <div className="space-y-6">
      <Link
        href="/admin/temas"
        className="inline-block text-xs uppercase tracking-widest text-stone-500 hover:text-console"
      >
        ← Voltar para temas
      </Link>
      <ThemeForm theme={theme} />
    </div>
  );
}
