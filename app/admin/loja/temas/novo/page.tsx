import AdminFormNav from '@/components/admin/AdminFormNav';
import StoreKitThemeForm from '@/components/admin/StoreKitThemeForm';
import { requireAdmin } from '@/lib/admin/auth';

export default async function AdminStoreKitThemeNewPage() {
  await requireAdmin();

  return (
    <div className="space-y-6">
      <AdminFormNav
        backHref="/admin/loja/temas"
        backLabel="Voltar para temas da loja"
      />
      <StoreKitThemeForm />
    </div>
  );
}
