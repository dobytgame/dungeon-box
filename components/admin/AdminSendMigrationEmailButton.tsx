'use client';

import AdminGatewayMigrationTools from '@/components/admin/AdminGatewayMigrationTools';

/** Compat: botão antigo agora inclui e-mail + copiar link. */
export default function AdminSendMigrationEmailButton(props: {
  subscriptionId: string;
  disabled?: boolean;
}) {
  return <AdminGatewayMigrationTools {...props} />;
}
