const UF_ALIASES: Record<string, string> = {
  AC: 'Acre',
  AL: 'Alagoas',
  AP: 'Amapá',
  AM: 'Amazonas',
  BA: 'Bahia',
  CE: 'Ceará',
  DF: 'Distrito Federal',
  ES: 'Espírito Santo',
  GO: 'Goiás',
  MA: 'Maranhão',
  MT: 'Mato Grosso',
  MS: 'Mato Grosso do Sul',
  MG: 'Minas Gerais',
  PA: 'Pará',
  PB: 'Paraíba',
  PR: 'Paraná',
  PE: 'Pernambuco',
  PI: 'Piauí',
  RJ: 'Rio de Janeiro',
  RN: 'Rio Grande do Norte',
  RS: 'Rio Grande do Sul',
  RO: 'Rondônia',
  RR: 'Roraima',
  SC: 'Santa Catarina',
  SP: 'São Paulo',
  SE: 'Sergipe',
  TO: 'Tocantins',
};

export function normalizeCityKey(city: string): string {
  return city
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeStateUf(state: string): string {
  return state.trim().toUpperCase().slice(0, 2);
}

export function stateDisplayName(uf: string): string {
  return UF_ALIASES[normalizeStateUf(uf)] ?? uf;
}

export function cityGeocodeQuery(city: string, state: string): string {
  const uf = normalizeStateUf(state);
  const stateName = stateDisplayName(uf);
  return `${city.trim()}, ${stateName}, Brasil`;
}

/** Desloca levemente pins da mesma cidade para o cluster conseguir separar no zoom. */
export function cityPinJitter(
  lat: number,
  lng: number,
  seed: string
): { lat: number; lng: number } {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  const angle = ((hash >>> 0) % 360) * (Math.PI / 180);
  const radius = 0.004 + (((hash >>> 8) % 100) / 100) * 0.012;
  return {
    lat: lat + Math.sin(angle) * radius,
    lng: lng + Math.cos(angle) * radius,
  };
}
