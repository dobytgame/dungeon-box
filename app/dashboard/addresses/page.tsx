import DashboardCard from '@/components/dashboard/DashboardCard';
import AddressManager from '@/components/dashboard/AddressManager';
import { getAddresses, requireDashboardUser } from '@/lib/dashboard/queries';

export default async function AddressesPage() {
  const { user } = await requireDashboardUser();
  const addresses = await getAddresses(user.id);

  return (
    <div className="space-y-8 md:space-y-10">
      <DashboardCard
        title="Endereços de entrega"
        description="Usado no checkout e vinculado à assinatura. Apenas um endereço padrão por conta."
      >
        <AddressManager addresses={addresses} />
      </DashboardCard>

    </div>
  );
}
