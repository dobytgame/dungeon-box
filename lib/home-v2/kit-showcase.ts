export type KitCategory = 'conteudo' | 'mesa' | 'planos' | 'unboxing' | 'encaixe' | 'colecao';
export type KitPlan = 'aventureiro' | 'heroi' | 'lendario';

export type KitGalleryItem = {
  id: string;
  category: KitCategory;
  mediaType: 'image' | 'video';
  src: string;
  thumbnail: string;
  plan?: KitPlan;
  badge: string;
  title: string;
  description: string;
  bullets?: readonly string[];
  cta?: { label: string; href: string };
  alt: string;
  position?: string;
};

export const KIT_TABS: Array<{ id: KitCategory; label: string }> = [
  { id: 'conteudo', label: 'O que vem no kit' },
  { id: 'mesa', label: 'Mesa montada' },
  { id: 'planos', label: 'Comparar planos' },
  { id: 'unboxing', label: 'Unboxing' },
  { id: 'encaixe', label: 'Como encaixa' },
  { id: 'colecao', label: 'Kits anteriores' },
];

export const KIT_PLANS_SECTION_HREF = '#planos';

const CTA_ASSINAR = { label: 'Assinar plano', href: KIT_PLANS_SECTION_HREF } as const;
const CTA_ADQUIRA = { label: 'Adquira já', href: KIT_PLANS_SECTION_HREF } as const;

export const KIT_GALLERY: KitGalleryItem[] = [
  {
    id: 'aventureiro-conteudo',
    category: 'conteudo',
    mediaType: 'image',
    src: '/images/home-v2/kits/dungeonbox-kit-aventureiro-conteudo.webp',
    thumbnail: '/images/home-v2/kits/dungeonbox-kit-aventureiro-conteudo.webp',
    plan: 'aventureiro',
    badge: 'Conteúdo real do kit',
    title: 'Isso é o que chega na sua caixa.',
    description: 'Pisos, paredes, corredores e os clipes que prendem a sala. Dá para montar no primeiro envio.',
    bullets: ['Pisos modulares', 'Paredes e corredores', 'Colunas', 'Encaixe sem cola'],
    cta: CTA_ASSINAR,
    alt: 'Peças soltas do plano Aventureiro: paredes, pisos, clipes e um saco de peças, com dados ao lado para escala',
  },
  {
    id: 'heroi-conteudo',
    category: 'conteudo',
    mediaType: 'image',
    src: '/images/home-v2/kits/dungeonbox-kit-heroi-conteudo.webp',
    thumbnail: '/images/home-v2/kits/dungeonbox-kit-heroi-conteudo.webp',
    plan: 'heroi',
    badge: 'Plano Herói',
    title: 'Mais piso, mais parede, a mesma caixa.',
    description: 'O Herói repete a base do Aventureiro e soma tiles e decoração para a mesa crescer já na primeira entrega.',
    bullets: ['Tudo do Aventureiro', 'Tiles extras', 'Decorações', 'Encaixe sem cola'],
    cta: CTA_ASSINAR,
    alt: 'Peças do plano Herói espalhadas na mesa: paredes, pisos, clipes e dados',
  },
  {
    id: 'aventureiro-mesa',
    category: 'mesa',
    mediaType: 'image',
    src: '/images/home-v2/kits/dungeonbox-mesa-kit-aventureiro.webp',
    thumbnail: '/images/home-v2/kits/dungeonbox-mesa-kit-aventureiro.webp',
    plan: 'aventureiro',
    badge: 'Mesa montada apenas com este kit',
    title: 'Da caixa direto para a aventura.',
    description: 'O primeiro kit já monta sala, porta e corredor. Abra, monte o cenário e prepare os dados.',
    bullets: ['Sala completa', 'Corredor', 'Porta', 'Um kit só'],
    cta: CTA_ASSINAR,
    alt: 'Sala de dungeon montada só com o plano Aventureiro, com porta gradeada, baú e corredor',
  },
  {
    id: 'heroi-mesa',
    category: 'mesa',
    mediaType: 'image',
    src: '/images/home-v2/kits/dungeonbox-mesa-kit-heroi.webp',
    thumbnail: '/images/home-v2/kits/dungeonbox-mesa-kit-heroi.webp',
    plan: 'heroi',
    badge: 'Mesa montada apenas com este kit',
    title: 'Uma caixa. Uma mesa completa.',
    description: 'Mais pisos e paredes para ligar salas e criar um mapa maior desde a primeira entrega.',
    bullets: ['Salas ligadas', 'Corredores', 'Decoração', 'Mesmo encaixe'],
    cta: CTA_ASSINAR,
    alt: 'Duas salas de dungeon ligadas por corredor, montadas com o plano Herói',
    position: 'center 40%',
  },
  {
    id: 'lendario-mesa',
    category: 'mesa',
    mediaType: 'image',
    src: '/images/home-v2/kits/dungeonbox-mesa-kit-lendario.webp',
    thumbnail: '/images/home-v2/kits/dungeonbox-mesa-kit-lendario.webp',
    plan: 'lendario',
    badge: 'Escala real',
    title: 'Feito para jogar de verdade.',
    description: 'Peças na escala da mesa de RPG. As miniaturas ao lado mostram o tamanho do mapa.',
    bullets: ['Mapa amplo', '3 miniaturas no plano', 'Decoração premium', 'Mesmo encaixe'],
    cta: CTA_ASSINAR,
    alt: 'Dungeon ampla do plano Lendário na mesa, com miniaturas ao lado dos arcos',
    position: '22% center',
  },
  {
    id: 'comparar-aventureiro',
    category: 'planos',
    mediaType: 'image',
    src: '/images/home-v2/kits/dungeonbox-mesa-kit-aventureiro.webp',
    thumbnail: '/images/home-v2/kits/dungeonbox-mesa-kit-aventureiro.webp',
    plan: 'aventureiro',
    badge: 'Plano Aventureiro',
    title: 'Para começar sua coleção.',
    description: 'Um conjunto compacto para montar salas, corredores e pequenos encontros.',
    cta: CTA_ASSINAR,
    alt: 'Mesa montada com o plano Aventureiro da DungeonBox',
  },
  {
    id: 'comparar-heroi',
    category: 'planos',
    mediaType: 'image',
    src: '/images/home-v2/kits/dungeonbox-mesa-kit-heroi.webp',
    thumbnail: '/images/home-v2/kits/dungeonbox-mesa-kit-heroi.webp',
    plan: 'heroi',
    badge: 'Plano Herói',
    title: 'Mais peças. Mais possibilidades.',
    description: 'Amplie os mapas e crie cenários maiores desde a primeira entrega.',
    cta: CTA_ASSINAR,
    alt: 'Mesa maior montada com o plano Herói da DungeonBox',
    position: 'center 40%',
  },
  {
    id: 'comparar-lendario',
    category: 'planos',
    mediaType: 'image',
    src: '/images/home-v2/kits/dungeonbox-mesa-kit-lendario.webp',
    thumbnail: '/images/home-v2/kits/dungeonbox-mesa-kit-lendario.webp',
    plan: 'lendario',
    badge: 'Plano Lendário',
    title: 'Para quem quer construir grande.',
    description: 'Mais cenário e miniaturas para mesas maiores e mapas de campanha.',
    cta: CTA_ASSINAR,
    alt: 'Mapa amplo montado com o plano Lendário da DungeonBox e miniaturas na mesa',
    position: '22% center',
  },
  {
    id: 'unboxing-lendario',
    category: 'unboxing',
    mediaType: 'image',
    src: '/images/home-v2/kits/dungeonbox-unboxing-lendario.webp',
    thumbnail: '/images/home-v2/kits/dungeonbox-unboxing-lendario.webp',
    plan: 'lendario',
    badge: 'Foto real do produto',
    title: 'Da caixa para a mesa.',
    description: 'A caixa abre com as peças separadas. É isto que chega antes de virar sala.',
    bullets: ['Peças na caixa', 'Sacos do kit', 'Cenário para montar'],
    cta: CTA_ASSINAR,
    alt: 'Caixa aberta do plano Lendário com peças de dungeon organizadas nas divisórias',
  },
  {
    id: 'openlock-close',
    category: 'encaixe',
    mediaType: 'image',
    src: '/images/home-v2/kits/dungeonbox-openlock-encaixe.webp',
    thumbnail: '/images/home-v2/kits/dungeonbox-openlock-encaixe.webp',
    badge: 'Sistema OpenLOCK',
    title: 'Monte. Desmonte. Crie outra dungeon.',
    description: 'As peças se reorganizam. Piso, parede e corredor se encontram sem cola.',
    bullets: ['Sem cola', 'Mesmo encaixe em todos os planos', 'Mapas diferentes com as mesmas peças'],
    cta: CTA_ADQUIRA,
    alt: 'Close da parede e do piso de pedra no ponto em que as peças se encontram',
  },
  {
    id: 'colecao-primeiro',
    category: 'colecao',
    mediaType: 'image',
    src: '/images/home-v2/kits/dungeonbox-mesa-kit-aventureiro.webp',
    thumbnail: '/images/home-v2/kits/dungeonbox-mesa-kit-aventureiro.webp',
    plan: 'aventureiro',
    badge: 'Foto real do produto',
    title: 'Os temas mudam. Sua coleção continua crescendo.',
    description: 'O kit novo não substitui o anterior. As peças novas se somam às que você já montou.',
    bullets: ['Mesmo sistema', 'Temas diferentes', 'A coleção aumenta'],
    cta: CTA_ADQUIRA,
    alt: 'Primeira sala montada, base da coleção modular da DungeonBox',
  },
  {
    id: 'colecao-maior',
    category: 'colecao',
    mediaType: 'image',
    src: '/images/home-v2/kits/dungeonbox-mesa-kit-lendario.webp',
    thumbnail: '/images/home-v2/kits/dungeonbox-mesa-kit-lendario.webp',
    plan: 'lendario',
    badge: 'Foto real do produto',
    title: 'Cada mês adiciona novas possibilidades.',
    description: 'Misture pisos, paredes, corredores e decorações dos kits para criar mapas maiores.',
    cta: CTA_ADQUIRA,
    alt: 'Mapa maior de dungeon na mesa, mostrando até onde a coleção pode crescer',
    position: '30% center',
  },
];

export const KIT_SHOWCASE_COPY = {
  eyebrow: 'Veja o kit na prática',
  title: 'Não imagine o que vem na caixa. Veja.',
  support:
    'Fotos reais dos kits DungeonBox, das peças que você recebe e das mesas que consegue montar desde o primeiro mês.',
  ampliar: 'Ampliar',
  previous: 'Foto anterior',
  next: 'Próxima foto',
  comparisonTitle: 'Escolha o tamanho da sua próxima aventura.',
  comparisonSupport:
    'Todos os planos seguem o mesmo sistema modular. O que muda é a quantidade de peças e o tamanho das possibilidades.',
  ctaSubscribe: 'Assinar plano',
  ctaAcquire: 'Adquira já',
} as const;

export function kitItemsByCategory(category: KitCategory): KitGalleryItem[] {
  return KIT_GALLERY.filter((item) => item.category === category);
}
