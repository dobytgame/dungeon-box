import Link from 'next/link';
import AdminGatewayConfigClient from '@/components/admin/AdminGatewayConfigClient';
import { requireAdmin } from '@/lib/admin/auth';
import { readActiveGatewayFromDb } from '@/lib/payments/gateway-config';
import { ASAAS_CONFIGURED } from '@/lib/asaas/client';
import { PAGARME_CONFIGURED } from '@/lib/pagarme/client';
import { getPaymentProvider } from '@/lib/payments/provider';

export default async function AdminGatewayPage() {
  await requireAdmin();

  const fromDb = await readActiveGatewayFromDb();
  const activeGateway =
    fromDb ?? (getPaymentProvider() === 'pagarme' ? 'pagarme' : 'asaas');

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
            Financeiro
          </p>
          <h1 className="mt-1 text-xl font-medium text-zinc-100">
            Gateway de pagamento
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Escolha qual provedor recebe novos checkouts de assinatura.
          </p>
        </div>
        <Link
          href="/admin/financeiro"
          className="font-mono text-[10px] uppercase tracking-widest text-console hover:underline"
        >
          ← Voltar ao financeiro
        </Link>
      </div>

      <AdminGatewayConfigClient
        activeGateway={activeGateway}
        asaasConfigured={ASAAS_CONFIGURED}
        pagarmeConfigured={PAGARME_CONFIGURED}
      />
    </div>
  );
}
