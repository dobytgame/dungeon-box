import type { SupabaseClient } from '@supabase/supabase-js';
import { parseStoreOrderMeta } from '@/lib/asaas/store-order-payment';
import { resolveCityCoordinates } from '@/lib/geo/city-geocode';
import {
  cityPinJitter,
  normalizeCityKey,
  normalizeStateUf,
} from '@/lib/geo/city-normalize';

export type SalesMapCustomerKind = 'subscription' | 'store' | 'both';

export type SalesMapPin = {
  id: string;
  userId: string;
  name: string;
  email: string | null;
  city: string;
  state: string;
  kind: SalesMapCustomerKind;
  lat: number;
  lng: number;
  href: string;
};

export type SalesMapData = {
  pins: SalesMapPin[];
  totals: {
    customers: number;
    subscription: number;
    store: number;
    both: number;
    cities: number;
    missingGeocode: number;
  };
  mapsApiKey: string | null;
};

type AddressRow = {
  id: string;
  user_id: string | null;
  city: string | null;
  state: string | null;
  is_default: boolean | null;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  display_name: string | null;
  email: string | null;
};

type CustomerAcc = {
  userId: string;
  addressId: string | null;
  city: string;
  state: string;
  hasSubscription: boolean;
  hasStore: boolean;
};

function googleMapsBrowserKey(): string | null {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();
  return key || null;
}

function pickAddress(
  byId: Map<string, AddressRow>,
  byUser: Map<string, AddressRow[]>,
  preferredId: string | null | undefined,
  userId: string
): AddressRow | null {
  if (preferredId) {
    const direct = byId.get(preferredId);
    if (direct?.city && direct.state) return direct;
  }

  const list = byUser.get(userId) ?? [];
  const withCity = list.filter((a) => a.city?.trim() && a.state?.trim());
  if (withCity.length === 0) return null;
  return withCity.find((a) => a.is_default) ?? withCity[0] ?? null;
}

function displayName(profile: ProfileRow | undefined, fallbackEmail: string | null): string {
  const name =
    profile?.display_name?.trim() ||
    profile?.full_name?.trim() ||
    fallbackEmail?.trim() ||
    'Cliente';
  return name;
}

export async function getAdminSalesMapData(
  admin: SupabaseClient
): Promise<SalesMapData> {
  const mapsApiKey = googleMapsBrowserKey();
  const empty: SalesMapData = {
    pins: [],
    totals: {
      customers: 0,
      subscription: 0,
      store: 0,
      both: 0,
      cities: 0,
      missingGeocode: 0,
    },
    mapsApiKey,
  };

  const [{ data: subscriptions }, { data: storePayments }] = await Promise.all([
    admin
      .from('subscriptions')
      .select('id, user_id, address_id, status')
      .eq('status', 'active'),
    admin
      .from('payments')
      .select('id, user_id, status, status_detail')
      .eq('status', 'approved')
      .ilike('status_detail', '%store_order%')
      .limit(5000),
  ]);

  const customers = new Map<string, CustomerAcc>();
  const addressIds = new Set<string>();
  const userIds = new Set<string>();

  for (const sub of subscriptions ?? []) {
    const userId = sub.user_id as string | null;
    if (!userId) continue;
    userIds.add(userId);
    if (sub.address_id) addressIds.add(sub.address_id as string);

    const existing = customers.get(userId);
    if (existing) {
      existing.hasSubscription = true;
      if (!existing.addressId && sub.address_id) {
        existing.addressId = sub.address_id as string;
      }
    } else {
      customers.set(userId, {
        userId,
        addressId: (sub.address_id as string | null) ?? null,
        city: '',
        state: '',
        hasSubscription: true,
        hasStore: false,
      });
    }
  }

  for (const payment of storePayments ?? []) {
    const userId = payment.user_id as string | null;
    if (!userId) continue;
    const meta = parseStoreOrderMeta(payment.status_detail as string | null);
    if (!meta) continue;

    userIds.add(userId);
    if (meta.addressId) addressIds.add(meta.addressId);

    const existing = customers.get(userId);
    if (existing) {
      existing.hasStore = true;
      if (!existing.addressId && meta.addressId) {
        existing.addressId = meta.addressId;
      }
    } else {
      customers.set(userId, {
        userId,
        addressId: meta.addressId ?? null,
        city: '',
        state: '',
        hasSubscription: false,
        hasStore: true,
      });
    }
  }

  if (customers.size === 0) return empty;

  const userIdList = Array.from(userIds);
  const [{ data: profiles }, { data: addressesById }, { data: addressesByUser }] =
    await Promise.all([
      admin
        .from('profiles')
        .select('id, full_name, display_name, email')
        .in('id', userIdList),
      addressIds.size > 0
        ? admin
            .from('addresses')
            .select('id, user_id, city, state, is_default')
            .in('id', Array.from(addressIds))
        : Promise.resolve({ data: [] as AddressRow[] }),
      admin
        .from('addresses')
        .select('id, user_id, city, state, is_default')
        .in('user_id', userIdList),
    ]);

  const profileById = new Map(
    ((profiles ?? []) as ProfileRow[]).map((p) => [p.id, p])
  );
  const addressById = new Map(
    ((addressesById ?? []) as AddressRow[]).map((a) => [a.id, a])
  );
  const addressesForUser = new Map<string, AddressRow[]>();
  for (const row of (addressesByUser ?? []) as AddressRow[]) {
    if (!row.user_id) continue;
    const list = addressesForUser.get(row.user_id) ?? [];
    list.push(row);
    addressesForUser.set(row.user_id, list);
  }

  const cityPairs: Array<{ city: string; state: string }> = [];

  for (const customer of Array.from(customers.values())) {
    const address = pickAddress(
      addressById,
      addressesForUser,
      customer.addressId,
      customer.userId
    );
    if (!address?.city || !address.state) continue;

    customer.city = address.city.trim();
    customer.state = normalizeStateUf(address.state);
    cityPairs.push({ city: customer.city, state: customer.state });
  }

  const coords = await resolveCityCoordinates(admin, cityPairs);
  const pins: SalesMapPin[] = [];
  let missingGeocode = 0;
  const cityKeys = new Set<string>();

  let subscriptionOnly = 0;
  let storeOnly = 0;
  let both = 0;

  for (const customer of Array.from(customers.values())) {
    if (!customer.city || !customer.state) {
      missingGeocode += 1;
      continue;
    }

    const cityNorm = normalizeCityKey(customer.city);
    const key = `${cityNorm}|${customer.state}`;
    const point = coords.get(key);
    if (!point) {
      missingGeocode += 1;
      continue;
    }

    cityKeys.add(key);
    const kind: SalesMapCustomerKind =
      customer.hasSubscription && customer.hasStore
        ? 'both'
        : customer.hasSubscription
          ? 'subscription'
          : 'store';

    if (kind === 'both') both += 1;
    else if (kind === 'subscription') subscriptionOnly += 1;
    else storeOnly += 1;

    const profile = profileById.get(customer.userId);
    const jittered = cityPinJitter(point.lat, point.lng, customer.userId);

    pins.push({
      id: customer.userId,
      userId: customer.userId,
      name: displayName(profile, profile?.email ?? null),
      email: profile?.email ?? null,
      city: customer.city,
      state: customer.state,
      kind,
      lat: jittered.lat,
      lng: jittered.lng,
      href: `/admin/clientes/${customer.userId}`,
    });
  }

  return {
    pins,
    totals: {
      customers: pins.length,
      subscription: subscriptionOnly,
      store: storeOnly,
      both,
      cities: cityKeys.size,
      missingGeocode,
    },
    mapsApiKey,
  };
}
