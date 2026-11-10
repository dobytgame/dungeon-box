import type { SupabaseClient } from '@supabase/supabase-js';
import {
  BLACK_FRIDAY_CAMPAIGN_CODE,
  blackFridayCtaPlacementLabel,
} from '@/lib/campaigns/black-friday';

export type BlackFridayCampaignRow = {
  id: string;
  created_at: string;
  cta_placement: string;
  billing_term: string;
  plan_slug: string;
  first_charge_cents: number;
  installments: number;
  user_id: string;
  subscription_id: string;
  profile: { email: string | null; full_name: string | null } | null;
};

export type BlackFridayPlacementStats = {
  id: string;
  placement: string;
  label: string;
  intents: number;
  signups: number;
};

export type BlackFridayCampaignReport = {
  intentsTotal: number;
  signupsTotal: number;
  chargeCentsTotal: number;
  byPlacement: BlackFridayPlacementStats[];
  signups: BlackFridayCampaignRow[];
};

function countByPlacement(rows: { cta_placement: string }[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const row of rows) {
    const key = row.cta_placement || 'unknown';
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return map;
}

export async function loadBlackFridayCampaignReport(
  admin: SupabaseClient,
  limit = 100
): Promise<BlackFridayCampaignReport> {
  const code = BLACK_FRIDAY_CAMPAIGN_CODE;

  const [intentsRes, signupsRes] = await Promise.all([
    admin
      .from('campaign_checkout_intents')
      .select('cta_placement')
      .eq('campaign_code', code),
    admin
      .from('campaign_signups')
      .select(
        `
        id,
        created_at,
        cta_placement,
        billing_term,
        plan_slug,
        first_charge_cents,
        installments,
        user_id,
        subscription_id,
        profiles ( email, full_name )
      `
      )
      .eq('campaign_code', code)
      .order('created_at', { ascending: false })
      .limit(limit),
  ]);

  const intents = intentsRes.data ?? [];
  const signupRows = signupsRes.data ?? [];

  const intentCounts = countByPlacement(intents);
  const signupCounts = countByPlacement(signupRows);

  const placements = new Set<string>();
  Array.from(intentCounts.keys()).forEach((key) => placements.add(key));
  Array.from(signupCounts.keys()).forEach((key) => placements.add(key));
  placements.add('oferta');
  placements.add('hero');
  placements.add('unknown');

  const byPlacement: BlackFridayPlacementStats[] = Array.from(placements)
    .map((placement) => ({
      id: placement,
      placement,
      label: blackFridayCtaPlacementLabel(placement),
      intents: intentCounts.get(placement) ?? 0,
      signups: signupCounts.get(placement) ?? 0,
    }))
    .sort((a, b) => b.signups - a.signups || b.intents - a.intents);

  const signups: BlackFridayCampaignRow[] = signupRows.map((row) => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    return {
      id: row.id as string,
      created_at: row.created_at as string,
      cta_placement: (row.cta_placement as string) || 'unknown',
      billing_term: row.billing_term as string,
      plan_slug: row.plan_slug as string,
      first_charge_cents: row.first_charge_cents as number,
      installments: row.installments as number,
      user_id: row.user_id as string,
      subscription_id: row.subscription_id as string,
      profile: profile
        ? {
            email: (profile as { email: string | null }).email,
            full_name: (profile as { full_name: string | null }).full_name,
          }
        : null,
    };
  });

  const chargeCentsTotal = signups.reduce((sum, row) => sum + row.first_charge_cents, 0);

  return {
    intentsTotal: intents.length,
    signupsTotal: signups.length,
    chargeCentsTotal,
    byPlacement,
    signups,
  };
}
