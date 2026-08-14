import type { SupabaseClient } from '@supabase/supabase-js';
import {
  cityGeocodeQuery,
  normalizeCityKey,
  normalizeStateUf,
} from '@/lib/geo/city-normalize';

export type CityCoordinate = {
  cityNorm: string;
  state: string;
  cityLabel: string;
  lat: number;
  lng: number;
};

type CachedRow = {
  city_norm: string;
  state: string;
  city_label: string;
  lat: number;
  lng: number;
};

function googleMapsApiKey(): string {
  return (
    process.env.GOOGLE_MAPS_API_KEY?.trim() ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ||
    ''
  );
}

async function geocodeWithGoogle(
  city: string,
  state: string
): Promise<{ lat: number; lng: number } | null> {
  const key = googleMapsApiKey();
  if (!key) return null;

  const address = encodeURIComponent(cityGeocodeQuery(city, state));
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${address}&components=country:BR&key=${key}`;
  const res = await fetch(url, { next: { revalidate: 0 } });
  if (!res.ok) return null;

  const data = (await res.json()) as {
    status?: string;
    results?: Array<{ geometry?: { location?: { lat: number; lng: number } } }>;
  };

  if (data.status !== 'OK' || !data.results?.[0]?.geometry?.location) {
    return null;
  }

  const { lat, lng } = data.results[0].geometry.location;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

async function geocodeWithNominatim(
  city: string,
  state: string
): Promise<{ lat: number; lng: number } | null> {
  const params = new URLSearchParams({
    format: 'json',
    limit: '1',
    countrycodes: 'br',
    city: city.trim(),
    state: normalizeStateUf(state),
  });

  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?${params.toString()}`,
    {
      headers: {
        'User-Agent': 'DungeonBoxAdminSalesMap/1.0 (mestre@dungeonbox.com.br)',
        Accept: 'application/json',
      },
      next: { revalidate: 0 },
    }
  );

  if (!res.ok) return null;

  const data = (await res.json()) as Array<{ lat?: string; lon?: string }>;
  const first = data[0];
  if (!first?.lat || !first?.lon) return null;

  const lat = Number(first.lat);
  const lng = Number(first.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

async function geocodeCity(
  city: string,
  state: string
): Promise<{ lat: number; lng: number; source: string } | null> {
  const google = await geocodeWithGoogle(city, state);
  if (google) return { ...google, source: 'google' };

  const nominatim = await geocodeWithNominatim(city, state);
  if (nominatim) return { ...nominatim, source: 'nominatim' };

  return null;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Resolve lat/lng por cidade+UF, com cache em `city_geocodes`.
 * Pins ficam no centro da cidade (não na rua).
 */
export async function resolveCityCoordinates(
  admin: SupabaseClient,
  cities: Array<{ city: string; state: string }>
): Promise<Map<string, CityCoordinate>> {
  const unique = new Map<string, { city: string; state: string; cityNorm: string }>();

  for (const item of cities) {
    const state = normalizeStateUf(item.state);
    const city = item.city.trim();
    if (!city || state.length !== 2) continue;
    const cityNorm = normalizeCityKey(city);
    if (!cityNorm) continue;
    const key = `${cityNorm}|${state}`;
    if (!unique.has(key)) {
      unique.set(key, { city, state, cityNorm });
    }
  }

  const result = new Map<string, CityCoordinate>();
  if (unique.size === 0) return result;

  const norms = Array.from(unique.values()).map((c) => c.cityNorm);
  const states = Array.from(new Set(Array.from(unique.values()).map((c) => c.state)));

  const { data: cached } = await admin
    .from('city_geocodes')
    .select('city_norm, state, city_label, lat, lng')
    .in('city_norm', norms)
    .in('state', states);

  for (const row of (cached ?? []) as CachedRow[]) {
    const key = `${row.city_norm}|${normalizeStateUf(row.state)}`;
    result.set(key, {
      cityNorm: row.city_norm,
      state: normalizeStateUf(row.state),
      cityLabel: row.city_label,
      lat: row.lat,
      lng: row.lng,
    });
  }

  const missing = Array.from(unique.entries()).filter(([key]) => !result.has(key));
  const hasGoogleKey = Boolean(googleMapsApiKey());
  const GEOCODE_BATCH_LIMIT = hasGoogleKey ? 40 : 8;
  const batch = missing.slice(0, GEOCODE_BATCH_LIMIT);

  for (let i = 0; i < batch.length; i += 1) {
    const [key, item] = batch[i];
    const coords = await geocodeCity(item.city, item.state);
    if (!coords) continue;

    const payload = {
      city_norm: item.cityNorm,
      state: item.state,
      city_label: item.city,
      lat: coords.lat,
      lng: coords.lng,
      source: coords.source,
    };

    const { error } = await admin.from('city_geocodes').upsert(payload, {
      onConflict: 'city_norm,state',
    });

    if (!error) {
      result.set(key, {
        cityNorm: item.cityNorm,
        state: item.state,
        cityLabel: item.city,
        lat: coords.lat,
        lng: coords.lng,
      });
    }

    // Nominatim pede ~1 req/s; Google tolera mais, mas mantemos ritmo seguro.
    if (i < batch.length - 1) {
      await sleep(coords.source === 'nominatim' ? 1100 : 120);
    }
  }

  return result;
}
