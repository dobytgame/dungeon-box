import type { SupabaseClient } from '@supabase/supabase-js';
import { relOne } from '@/lib/dashboard/format';
import { todayBrazilDateKey } from '@/lib/datetime/brazil';
import { maskPhone } from '@/lib/masks';

const PAGE_SIZE = 1000;

export type ActiveSubscriberContact = {
  nome: string;
  email: string;
  celular: string;
};

type ProfileContact = {
  full_name?: string | null;
  display_name?: string | null;
  email?: string | null;
  phone?: string | null;
};

function profileName(profile: ProfileContact): string {
  return profile.full_name?.trim() || profile.display_name?.trim() || '';
}

function formatCelular(phone: string | null | undefined): string {
  if (!phone) return '';
  return maskPhone(phone);
}

function csvField(value: string): string {
  if (/[;"\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function buildActiveSubscribersCsv(
  rows: ActiveSubscriberContact[]
): string {
  const lines = [
    ['nome', 'email', 'celular'].join(';'),
    ...rows.map((row) =>
      [csvField(row.nome), csvField(row.email), csvField(row.celular)].join(';')
    ),
  ];
  return `\uFEFF${lines.join('\r\n')}\r\n`;
}

export function activeSubscribersCsvFilename(now = new Date()): string {
  return `assinantes-ativos-${todayBrazilDateKey(now)}.csv`;
}

export async function listActiveSubscriberContacts(
  admin: SupabaseClient
): Promise<ActiveSubscriberContact[]> {
  const byUser = new Map<string, ActiveSubscriberContact>();
  let from = 0;

  while (true) {
    const { data, error } = await admin
      .from('subscriptions')
      .select('user_id, profiles(full_name, display_name, email, phone)')
      .eq('status', 'active')
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      throw new Error(error.message);
    }
    if (!data?.length) break;

    for (const row of data) {
      const userId = row.user_id as string | null;
      if (!userId || byUser.has(userId)) continue;

      const profile = relOne(row.profiles as ProfileContact | ProfileContact[] | null);
      byUser.set(userId, {
        nome: profile ? profileName(profile) : '',
        email: profile?.email?.trim().toLowerCase() ?? '',
        celular: formatCelular(profile?.phone),
      });
    }

    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return Array.from(byUser.values()).sort((a, b) => {
    const nameCmp = a.nome.localeCompare(b.nome, 'pt-BR', {
      sensitivity: 'base',
    });
    if (nameCmp !== 0) return nameCmp;
    return a.email.localeCompare(b.email, 'pt-BR');
  });
}
