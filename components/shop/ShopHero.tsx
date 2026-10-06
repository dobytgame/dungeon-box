import ShopHeroSlider from '@/components/shop/ShopHeroSlider';

const DEFAULT_BANNER = {
  id: 'loja-default',
  title: 'Extras para sua mesa de RPG',
  subtitle:
    'Kits de pintura, cópias do kit do mês e acessórios para complementar sua dungeon — com a mesma qualidade da assinatura.',
  ctaLabel: 'Ver produtos',
  ctaHref: '#produtos',
  imageUrl: '/images/home-v2/jornada-bg.webp',
};

export default function ShopHero() {
  return <ShopHeroSlider banners={[DEFAULT_BANNER]} />;
}
