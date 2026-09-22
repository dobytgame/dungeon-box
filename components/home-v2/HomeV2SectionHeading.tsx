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
        <p className="home-v2-display text-[11px] tracking-[0.28em] text-mesa-jade">
          {eyebrow}
        </p>
      ) : null}
      <h2
        id={titleId}
        className="home-v2-display mt-3 text-balance text-[clamp(2rem,7vw,4.25rem)] leading-[0.92] tracking-wide text-mesa-parchment"
      >
        {title}
      </h2>
      {support ? (
        <p className="mt-4 max-w-xl text-pretty text-base leading-relaxed text-mesa-ash">
          {support}
        </p>
      ) : null}
    </header>
  );
}
