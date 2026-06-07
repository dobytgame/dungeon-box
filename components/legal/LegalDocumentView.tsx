import Link from 'next/link';
import type { LegalDocument } from '@/lib/legal/types';

interface Props {
  document: LegalDocument;
  lastUpdated: string;
  version: string;
}

export default function LegalDocumentView({ document, lastUpdated, version }: Props) {
  return (
    <article className="legal-prose">
      <header className="border-b border-white/[0.06] pb-8">
        <p className="font-display text-xs uppercase tracking-[0.35em] text-frost">
          Documento legal
        </p>
        <h1 className="mt-3 font-display text-3xl uppercase leading-[0.95] tracking-wide text-white sm:text-4xl md:text-5xl">
          {document.title}
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-stone-400">
          {document.subtitle}
        </p>
        <p className="mt-4 text-xs text-stone-600">
          Última atualização: {lastUpdated} · Versão {version}
        </p>
      </header>

      <div className="mt-10 space-y-10">
        {document.sections.map((section) => (
          <section key={section.id} id={section.id} className="scroll-mt-28">
            <h2 className="font-display text-xl uppercase tracking-wide text-white sm:text-2xl">
              {section.title}
            </h2>

            {section.paragraphs?.map((p, i) => (
              <p key={i} className="mt-4 text-sm leading-relaxed text-stone-300 sm:text-base">
                {p}
              </p>
            ))}

            {section.list ? (
              <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-stone-300 sm:text-base">
                {section.list.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            ) : null}

            {section.subsections?.map((sub) => (
              <div key={sub.title} className="mt-6 rounded-sm border border-white/[0.06] bg-white/[0.02] p-4 sm:p-5">
                <h3 className="font-display text-sm uppercase tracking-widest text-stone-200">
                  {sub.title}
                </h3>
                {sub.paragraphs?.map((p, i) => (
                  <p key={i} className="mt-3 text-sm leading-relaxed text-stone-400">
                    {p}
                  </p>
                ))}
                {sub.list ? (
                  <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-stone-400">
                    {sub.list.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ))}
          </section>
        ))}
      </div>

      <footer className="mt-12 border-t border-white/[0.06] pt-8">
        <p className="text-sm text-stone-500">
          Documento relacionado:{' '}
          {document.title.includes('Privacidade') ? (
            <Link href="/termos" className="text-ember hover:underline">
              Termos de Uso
            </Link>
          ) : (
            <Link href="/privacidade" className="text-ember hover:underline">
              Política de Privacidade
            </Link>
          )}
        </p>
      </footer>
    </article>
  );
}
