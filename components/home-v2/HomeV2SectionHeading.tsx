interface Props {
  eyebrow?: string;
  title: string;
  titleId: string;
  support?: string;
  align?: 'left' | 'center';
  /** `md` store · `lg` seções · `xl` CTA final (escala do hero). */
  size?: 'lg' | 'md' | 'xl';
  as?: 'h1' | 'h2';
}

const TITLE_SIZES = {
  xl: 'text-[clamp(2.75rem,10vw,6rem)] leading-[0.88]',
  lg: 'text-[clamp(2rem,7vw,4.25rem)] leading-[0.92]',
  md: 'text-[clamp(1.85rem,5vw,3rem)] leading-[0.95]',
} as const;

const HEADER_MAX: Record<NonNullable<Props['size']>, string> = {
  xl: 'max-w-5xl',
  lg: 'max-w-3xl',
  md: 'max-w-3xl',
};

export default function HomeV2SectionHeading({
  eyebrow,
  title,
  titleId,
  support,
  align = 'left',
  size = 'lg',
  as: Title = 'h2',
}: Props) {
  return (
    <header
      className={`${HEADER_MAX[size]} ${align === 'center' ? 'mx-auto text-center' : ''}`}
    >
      {eyebrow ? (
        <p className="home-v2-reveal home-v2-display text-[11px] tracking-[0.28em] text-mesa-jade">
          {eyebrow}
        </p>
      ) : null}
      <Title
        id={titleId}
        data-reveal="mask"
        className={`home-v2-reveal home-v2-display mt-3 text-balance tracking-wide text-mesa-parchment ${TITLE_SIZES[size]}`}
        style={{ '--stagger': 1 } as React.CSSProperties}
      >
        {title}
      </Title>
      {support ? (
        <p
          className={`home-v2-reveal mt-4 max-w-xl text-pretty text-base leading-relaxed text-mesa-ash ${
            align === 'center' ? 'mx-auto' : ''
          }`}
          style={{ '--stagger': 2 } as React.CSSProperties}
        >
          {support}
        </p>
      ) : null}
    </header>
  );
}
