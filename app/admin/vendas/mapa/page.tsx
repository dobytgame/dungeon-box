import AdminSection from '@/components/admin/AdminSection';
import KpiCard from '@/components/admin/KpiCard';
import SalesCustomersMap from '@/components/admin/SalesCustomersMap';
import { requireAdmin } from '@/lib/admin/auth';
import { getAdminSalesMapData } from '@/lib/admin/sales-map';

export default async function AdminSalesMapPage() {
  const { admin } = await requireAdmin();
  const data = await getAdminSalesMapData(admin);

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Clientes no mapa" value={String(data.totals.customers)} />
        <KpiCard label="Cidades" value={String(data.totals.cities)} />
        <KpiCard
          label="Assinatura / Loja / Ambos"
          value={`${data.totals.subscription} / ${data.totals.store} / ${data.totals.both}`}
        />
        <KpiCard
          label="Sem geocode"
          value={String(data.totals.missingGeocode)}
          hint="Endereço sem cidade/UF ou cidade ainda não resolvida"
        />
      </div>

      <AdminSection title="Mapa de clientes">
        <p className="mb-4 text-sm text-zinc-500">
          Pins por cidade (não por rua). Zoom out agrupa; zoom in separa por município.
        </p>
        {!data.mapsApiKey ? (
          <div className="rounded border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            Configure <code className="font-mono text-xs">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code>{' '}
            com Maps JavaScript API (e Map ID opcional). Para geocode mais estável, use também{' '}
            <code className="font-mono text-xs">GOOGLE_MAPS_API_KEY</code> com Geocoding API;
            sem ela o sistema usa Nominatim (OpenStreetMap) com cache.
          </div>
        ) : data.pins.length === 0 ? (
          <p className="text-sm text-zinc-500">
            Nenhum cliente com assinatura ativa ou compra na loja e cidade válida para plotar.
          </p>
        ) : (
          <SalesCustomersMap pins={data.pins} apiKey={data.mapsApiKey} />
        )}
      </AdminSection>
    </div>
  );
}
