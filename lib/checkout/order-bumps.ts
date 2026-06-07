export const PAINT_KIT_BUMPS = [
  {
    id: 'amador',
    name: 'Kit de Pintura Amador',
    priceCents: 4900,
    priceLabel: 'R$ 49',
    tagline: 'Ideal para quem está começando a pintar minis',
    includes: [
      '3 tintas acrílicas base (cinza, marrom, preto)',
      '2 pincéis essenciais',
      'Guia PDF de pintura para iniciantes',
    ],
  },
  {
    id: 'profissional',
    name: 'Kit de Pintura Profissional',
    priceCents: 9900,
    priceLabel: 'R$ 99',
    tagline: 'Acabamento de mesa com qualidade de loja',
    includes: [
      '8 tintas + washes e efeitos',
      '5 pincéis de detalhe profissional',
      'Paleta, diluente e guia avançado',
    ],
    featured: true,
  },
] as const;

export type PaintKitBumpId = (typeof PAINT_KIT_BUMPS)[number]['id'];

export function getPaintKitBump(id: PaintKitBumpId | null | undefined) {
  if (!id) return null;
  return PAINT_KIT_BUMPS.find((b) => b.id === id) ?? null;
}
