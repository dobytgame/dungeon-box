import type { SupabaseClient } from '@supabase/supabase-js';
import {
  parseAdminListPagination,
  type AdminPaginatedResult,
} from '@/lib/admin/list-pagination';
import { digitsOnly, maskPhone } from '@/lib/masks';

export type WhatsAppLeadSortField = 'created_at' | 'name' | 'email';

export interface AdminWhatsAppLeadRow {
  id: string;
  name: string;
  email: string;
  phone_e164: string;
  phone_display: string;
  source: string;
  page_path: string | null;
  page_url: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  created_at: string;
}

export interface ListAdminWhatsAppLeadsFilters {
  q?: string;
  page?: number;
  pageSize?: number;
  sort?: WhatsAppLeadSortField;
  order?: 'asc' | 'desc';
}

const SOURCE_LABELS: Record<string, string> = {
  floating_widget: 'Widget — LP',
  floating_widget_loja: 'Widget — Loja',
  floating_widget_guilda: 'Widget — Guilda',
};

export function whatsAppLeadSourceLabel(source: string): string {
  return SOURCE_LABELS[source] ?? source;
}

function formatPhoneE164(phoneE164: string): string {
  const digits = digitsOnly(phoneE164);
  const local = digits.startsWith('55') ? digits.slice(2) : digits;
  return maskPhone(local);
}

function escapeIlikePattern(value: string): string {
  return value.replace(/[%_]/g, ' ').trim();
}

export async function countWhatsAppLeads(
  admin: SupabaseClient
): Promise<number> {
  const { count, error } = await admin
    .from('whatsapp_leads')
    .select('id', { count: 'exact', head: true });

  if (error) {
    console.error('[admin] countWhatsAppLeads:', error.message);
    return 0;
  }

  return count ?? 0;
}

export async function listAdminWhatsAppLeads(
  admin: SupabaseClient,
  filters: ListAdminWhatsAppLeadsFilters = {}
): Promise<AdminPaginatedResult<AdminWhatsAppLeadRow>> {
  const pagination = parseAdminListPagination(
    {
      page: filters.page != null ? String(filters.page) : undefined,
      pageSize: filters.pageSize != null ? String(filters.pageSize) : undefined,
      sort: filters.sort,
      order: filters.order,
    },
    {
      defaultSort: 'created_at',
      defaultOrder: 'desc',
      allowedSorts: ['created_at', 'name', 'email'] satisfies WhatsAppLeadSortField[],
    }
  );

  const q = filters.q?.trim() ?? '';
  const pageSize = pagination.pageSize;
  const rangeFrom = (pagination.page - 1) * pageSize;
  const rangeTo = rangeFrom + pageSize - 1;

  let query = admin
    .from('whatsapp_leads')
    .select(
      'id, name, email, phone_e164, source, page_path, page_url, utm_source, utm_medium, utm_campaign, created_at',
      { count: 'exact' }
    );

  if (q) {
    const escaped = escapeIlikePattern(q);
    const phoneDigits = digitsOnly(q);
    const clauses = [
      `name.ilike.%${escaped}%`,
      `email.ilike.%${escaped}%`,
    ];

    if (phoneDigits.length >= 4) {
      clauses.push(`phone_e164.ilike.%${phoneDigits}%`);
    }

    query = query.or(clauses.join(','));
  }

  const { data, error, count } = await query
    .order(pagination.sort, {
      ascending: pagination.order === 'asc',
      nullsFirst: pagination.order === 'asc',
    })
    .range(rangeFrom, rangeTo);

  if (error) {
    console.error('[admin] listAdminWhatsAppLeads:', error.message);
    return {
      items: [],
      total: 0,
      page: pagination.page,
      pageSize,
      totalPages: 1,
    };
  }

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return {
    items: (data ?? []).map((row) => ({
      id: row.id as string,
      name: row.name as string,
      email: row.email as string,
      phone_e164: row.phone_e164 as string,
      phone_display: formatPhoneE164(row.phone_e164 as string),
      source: row.source as string,
      page_path: (row.page_path as string | null) ?? null,
      page_url: (row.page_url as string | null) ?? null,
      utm_source: (row.utm_source as string | null) ?? null,
      utm_medium: (row.utm_medium as string | null) ?? null,
      utm_campaign: (row.utm_campaign as string | null) ?? null,
      created_at: row.created_at as string,
    })),
    total,
    page: Math.min(pagination.page, totalPages),
    pageSize,
    totalPages,
  };
}
