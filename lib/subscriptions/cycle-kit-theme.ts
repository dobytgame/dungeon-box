import type { SupabaseClient } from '@supabase/supabase-js';
import type { CycleStatus } from '@/lib/dashboard/types';
import {
  formatStoreKitThemeLabel,
  loadStoreKitThemes,
  type StoreKitTheme,
} from '@/lib/store/kit-themes';

export const CYCLE_KIT_THEME_CHANGEABLE_STATUS: CycleStatus = 'upcoming';

const KIT_THEME_SELECT = 'id, slug, name, kit_number, description, image_url, is_active, sort_order';

export type CycleKitThemeRef = {
  id: string;
  name: string;
  slug: string;
  kitNumber?: number;
  kit_number?: number;
  imageUrl?: string | null;
  image_url?: string | null;
  description?: string | null;
  isActive?: boolean;
  is_active?: boolean;
  sortOrder?: number;
  sort_order?: number;
};

export type CycleKitThemeState = {
  cycleId: string;
  cycleNumber: number;
  status: CycleStatus;
  current: StoreKitTheme;
  previous: StoreKitTheme | null;
  changed: boolean;
  changedNotice: string | null;
  canChange: boolean;
  lockedReason: string | null;
};

function relKitTheme(value: unknown): CycleKitThemeRef | null {
  const row = Array.isArray(value) ? value[0] : value;
  if (!row || typeof row !== 'object' || !('id' in row)) return null;
  return row as CycleKitThemeRef;
}

function asTheme(row: {
  id: string;
  name: string;
  slug: string;
  kitNumber?: number;
  kit_number?: number;
  imageUrl?: string | null;
  image_url?: string | null;
  description?: string | null;
  isActive?: boolean;
  is_active?: boolean;
  sortOrder?: number;
  sort_order?: number;
}): StoreKitTheme {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    kitNumber: row.kitNumber ?? row.kit_number ?? 1,
    description: row.description ?? null,
    imageUrl: row.imageUrl ?? row.image_url ?? null,
    isActive: row.isActive ?? row.is_active ?? true,
    sortOrder: row.sortOrder ?? row.sort_order ?? 0,
  };
}

export function findKitThemeById(
  themes: StoreKitTheme[],
  themeId: string | null | undefined
): StoreKitTheme | null {
  if (!themeId) return null;
  return themes.find((theme) => theme.id === themeId) ?? null;
}

export function findKitThemeByNumber(
  themes: StoreKitTheme[],
  kitNumber: number
): StoreKitTheme | null {
  return themes.find((theme) => theme.kitNumber === kitNumber) ?? null;
}

/** Padrão: toda assinatura começa no kit 1. */
export function resolveDefaultKitTheme(themes: StoreKitTheme[]): StoreKitTheme | null {
  return (
    findKitThemeByNumber(themes, 1) ??
    [...themes].sort((a, b) => a.kitNumber - b.kitNumber)[0] ??
    null
  );
}

export function resolveCycleKitTheme(
  themes: StoreKitTheme[],
  kitThemeId: string | null | undefined,
  joined?: CycleKitThemeRef | StoreKitTheme | null
): StoreKitTheme | null {
  if (joined?.id) return asTheme(joined);
  return findKitThemeById(themes, kitThemeId) ?? resolveDefaultKitTheme(themes);
}

export function cycleKitThemeChanged(
  current: StoreKitTheme | null,
  defaultTheme: StoreKitTheme | null,
  changedFromId: string | null | undefined
): boolean {
  if (changedFromId) return true;
  if (!current || !defaultTheme) return false;
  return current.id !== defaultTheme.id;
}

export function cycleKitThemeChangedNotice(
  current: StoreKitTheme | null,
  previous: StoreKitTheme | null
): string | null {
  if (!current || !previous || current.id === previous.id) return null;
  return `Tema alterado: ${formatStoreKitThemeLabel(previous)} → ${formatStoreKitThemeLabel(current)}`;
}

export function canChangeCycleKitTheme(status: CycleStatus): boolean {
  return status === CYCLE_KIT_THEME_CHANGEABLE_STATUS;
}

export function cycleKitThemeLockedReason(status: CycleStatus): string | null {
  if (canChangeCycleKitTheme(status)) return null;
  return 'O kit deste mês já entrou em produção e o tema não pode mais ser alterado.';
}

export function buildCycleKitThemeState(input: {
  cycleId: string;
  cycleNumber: number;
  status: CycleStatus;
  themes: StoreKitTheme[];
  kitThemeId?: string | null;
  changedFromId?: string | null;
  joinedCurrent?: CycleKitThemeRef | StoreKitTheme | null;
  joinedPrevious?: CycleKitThemeRef | StoreKitTheme | null;
}): CycleKitThemeState | null {
  const defaultTheme = resolveDefaultKitTheme(input.themes);
  const current = resolveCycleKitTheme(
    input.themes,
    input.kitThemeId,
    input.joinedCurrent
  );
  if (!current) return null;

  const previous =
    findKitThemeById(input.themes, input.changedFromId) ??
    (input.joinedPrevious ? asTheme(input.joinedPrevious) : null) ??
    (cycleKitThemeChanged(current, defaultTheme, input.changedFromId)
      ? defaultTheme
      : null);

  const changed = cycleKitThemeChanged(current, defaultTheme, input.changedFromId);

  return {
    cycleId: input.cycleId,
    cycleNumber: input.cycleNumber,
    status: input.status,
    current,
    previous: changed ? previous : null,
    changed,
    changedNotice: changed ? cycleKitThemeChangedNotice(current, previous) : null,
    canChange: canChangeCycleKitTheme(input.status),
    lockedReason: cycleKitThemeLockedReason(input.status),
  };
}

export async function loadCycleKitThemeCatalog(
  admin: SupabaseClient
): Promise<StoreKitTheme[]> {
  return loadStoreKitThemes(admin, { activeOnly: true });
}

const CYCLE_KIT_THEME_ROW_SELECT = `
  id,
  cycle_number,
  status,
  kit_theme_id,
  kit_theme_changed_from_id,
  kit_theme:store_kit_themes!kit_theme_id(${KIT_THEME_SELECT}),
  previous_kit_theme:store_kit_themes!kit_theme_changed_from_id(${KIT_THEME_SELECT})
`;

export async function loadChangeableCycleKitThemeState(
  admin: SupabaseClient,
  subscriptionId: string
): Promise<{
  themes: StoreKitTheme[];
  state: CycleKitThemeState | null;
}> {
  const themes = await loadCycleKitThemeCatalog(admin);

  const { data, error } = await admin
    .from('subscription_cycles')
    .select(CYCLE_KIT_THEME_ROW_SELECT)
    .eq('subscription_id', subscriptionId)
    .eq('status', CYCLE_KIT_THEME_CHANGEABLE_STATUS)
    .order('cycle_number', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[kit-theme] loadChangeableCycle:', error.message);
  }

  if (data) {
    return {
      themes,
      state: buildCycleKitThemeState({
        cycleId: data.id as string,
        cycleNumber: data.cycle_number as number,
        status: data.status as CycleStatus,
        themes,
        kitThemeId: data.kit_theme_id as string | null,
        changedFromId: data.kit_theme_changed_from_id as string | null,
        joinedCurrent: relKitTheme(data.kit_theme),
        joinedPrevious: relKitTheme(data.previous_kit_theme),
      }),
    };
  }

  const { data: currentCycle } = await admin
    .from('subscription_cycles')
    .select(CYCLE_KIT_THEME_ROW_SELECT)
    .eq('subscription_id', subscriptionId)
    .in('status', [
      'upcoming',
      'production',
      'preparing',
      'packed',
      'awaiting_pickup',
      'shipped',
    ])
    .order('cycle_number', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!currentCycle) return { themes, state: null };

  return {
    themes,
    state: buildCycleKitThemeState({
      cycleId: currentCycle.id as string,
      cycleNumber: currentCycle.cycle_number as number,
      status: currentCycle.status as CycleStatus,
      themes,
      kitThemeId: currentCycle.kit_theme_id as string | null,
      changedFromId: currentCycle.kit_theme_changed_from_id as string | null,
      joinedCurrent: relKitTheme(currentCycle.kit_theme),
      joinedPrevious: relKitTheme(currentCycle.previous_kit_theme),
    }),
  };
}

export async function changeSubscriptionCycleKitTheme(
  admin: SupabaseClient,
  input: {
    userId: string;
    subscriptionId: string;
    cycleId: string;
    themeId: string;
  }
): Promise<{ error?: string; success?: true; notice?: string | null }> {
  const themes = await loadCycleKitThemeCatalog(admin);
  const nextTheme = findKitThemeById(themes, input.themeId);
  if (!nextTheme || !nextTheme.isActive) {
    return { error: 'Tema inválido ou indisponível.' };
  }

  const { data: subscription } = await admin
    .from('subscriptions')
    .select('id, user_id, status')
    .eq('id', input.subscriptionId)
    .eq('user_id', input.userId)
    .maybeSingle();

  if (!subscription) {
    return { error: 'Assinatura não encontrada.' };
  }

  if (subscription.status !== 'active' && subscription.status !== 'paused') {
    return { error: 'Só é possível trocar o tema de uma assinatura ativa.' };
  }

  const { data: cycle } = await admin
    .from('subscription_cycles')
    .select(CYCLE_KIT_THEME_ROW_SELECT)
    .eq('id', input.cycleId)
    .eq('subscription_id', input.subscriptionId)
    .maybeSingle();

  if (!cycle) {
    return { error: 'Ciclo não encontrado.' };
  }

  if (!canChangeCycleKitTheme(cycle.status as CycleStatus)) {
    return { error: cycleKitThemeLockedReason(cycle.status as CycleStatus) ?? 'Tema bloqueado.' };
  }

  const defaultTheme = resolveDefaultKitTheme(themes);
  const current = resolveCycleKitTheme(
    themes,
    cycle.kit_theme_id as string | null,
    relKitTheme(cycle.kit_theme)
  );

  const revertingToDefault = defaultTheme && nextTheme.id === defaultTheme.id;
  const { error } = await admin
    .from('subscription_cycles')
    .update({
      kit_theme_id: revertingToDefault ? null : nextTheme.id,
      kit_theme_changed_from_id: revertingToDefault
        ? null
        : current?.id ?? defaultTheme?.id ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', cycle.id);

  if (error) {
    console.error('[kit-theme] changeSubscriptionCycleKitTheme:', error.message);
    return { error: 'Não foi possível salvar a troca de tema.' };
  }

  return {
    success: true,
    notice: revertingToDefault
      ? null
      : cycleKitThemeChangedNotice(nextTheme, current),
  };
}
