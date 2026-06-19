interface Props {
  eyebrow: string;
  title: string;
  description: string;
}

export default function AdminPageIntro({ eyebrow, title, description }: Props) {
  return (
    <header className="max-w-3xl border-l-2 border-console/50 pl-4">
      <p className="font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-console">
        {eyebrow}
      </p>
      <h1 className="mt-2 font-mono text-2xl font-medium tracking-tight text-zinc-100 md:text-3xl">
        {title}
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-500">{description}</p>
    </header>
  );
}
