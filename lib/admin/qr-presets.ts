import { checkoutHref } from '@/lib/checkout/plans';
import { absoluteUrl } from '@/lib/seo/site';

export type QrPreset = {
  id: string;
  label: string;
  description: string;
  url: string;
};

export function getQrPresets(): QrPreset[] {
  return [
    {
      id: 'home',
      label: 'Site — Home',
      description: 'Página principal da DungeonBox',
      url: absoluteUrl('/'),
    },
    {
      id: 'loja',
      label: 'Loja',
      description: 'Catálogo de produtos avulsos',
      url: absoluteUrl('/loja'),
    },
    {
      id: 'plan-aventureiro',
      label: 'Plano Aventureiro',
      description: 'Seção do plano na home',
      url: absoluteUrl('/#plan-aventureiro'),
    },
    {
      id: 'plan-heroi',
      label: 'Plano Herói',
      description: 'Seção do plano na home',
      url: absoluteUrl('/#plan-heroi'),
    },
    {
      id: 'plan-lendario',
      label: 'Plano Lendário',
      description: 'Seção do plano na home',
      url: absoluteUrl('/#plan-lendario'),
    },
    {
      id: 'checkout-heroi',
      label: 'Checkout — Herói',
      description: 'Assinatura direta do plano Herói',
      url: absoluteUrl(checkoutHref('heroi')),
    },
    {
      id: 'checkout-lendario',
      label: 'Checkout — Lendário',
      description: 'Assinatura direta do plano Lendário',
      url: absoluteUrl(checkoutHref('lendario')),
    },
  ];
}
