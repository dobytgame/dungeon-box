import type { SupabaseClient } from '@supabase/supabase-js';

export async function logAdminAction(
  admin: SupabaseClient,
  input: {
    actorId: string;
    action: string;
    entityType: string;
    entityId?: string | null;
    metadata?: Record<string, unknown>;
    ipAddress?: string | null;
  }
): Promise<void> {
  const { error } = await admin.from('admin_audit_log').insert({
    actor_id: input.actorId,
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId ?? null,
    metadata: input.metadata ?? {},
    ip_address: input.ipAddress ?? null,
  });

  if (error) {
    console.error('[admin] audit log failed:', error);
  }
}
