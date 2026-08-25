import { notFound } from 'next/navigation';
import AdminFormNav from '@/components/admin/AdminFormNav';
import StoreKitThemeForm from '@/components/admin/StoreKitThemeForm';
import { requireAdmin } from '@/lib/admin/auth';
import { getAdminStoreKitTheme } from '@/lib/admin/store-kit-themes';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AdminStoreKitThemePage({ params }: Props) {
  const { id } = await params;
  const { admin } = await requireAdmin();
  const theme = await getAdminStoreKitTheme(admin, id);

  if (!theme) notFound();

  return (
    <div className="space-y-6">
      <AdminFormNav
        backHref="/admin/loja/temas"
        backLabel="Voltar para temas da loja"
        createHref="/admin/loja/temas/novo"
        createLabel="Criar novo tema"
      />
      <StoreKitThemeForm theme={theme} />
    </div>
  );
}
