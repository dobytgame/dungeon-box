interface Props {
  eyebrow?: string;
  title: string;
  titleId: string;
  support?: string;
  align?: 'left' | 'center';
}

export default function HomeV2SectionHeading({
  eyebrow,
  title,
  titleId,
  support,
  align = 'left',
}: Props) {
  return (
    <header className={align === 'center' ? 'mx-auto max-w-3xl text-center' : 'max-w-3xl'}>
      {eyebrow ? (
        <p className="home-v2-reveal home-v2-display text-[11px] tracking-[0.28em] text-mesa-jade">
          {eyebrow}
        </p>
      ) : null}
      <h2
        id={titleId}
        data-reveal="mask"
        className="home-v2-reveal home-v2-display mt-3 text-balance text-[clamp(2rem,7vw,4.25rem)] leading-[0.92] tracking-wide text-mesa-parchment"
        style={{ '--stagger': 1 } as React.CSSProperties}
      >
        {title}
      </h2>
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
