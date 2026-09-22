import HomeV2MediaFrame from '@/components/home-v2/HomeV2MediaFrame';
import HomeV2SectionHeading from '@/components/home-v2/HomeV2SectionHeading';
import { HOME_V2_COPY, type HomeV2Testimonial } from '@/lib/home-v2/content';

interface Props {
  testimonials: HomeV2Testimonial[];
}

export default function HomeV2SocialProof({ testimonials }: Props) {
  if (testimonials.length === 0) return null;

  return (
    <section
      id="prova"
      className="bg-mesa-ink px-4 py-16 sm:px-6 md:py-24"
      aria-labelledby="home-v2-prova-title"
    >
      <div className="mx-auto max-w-6xl">
        <HomeV2SectionHeading
          eyebrow={HOME_V2_COPY.social.eyebrow}
          title={HOME_V2_COPY.social.title}
          titleId="home-v2-prova-title"
        />

        <div className="mt-10 columns-2 gap-3 md:columns-3 md:gap-4">
          {testimonials.map((item, index) => (
            <figure
              key={item.id}
              className={`mb-3 break-inside-avoid overflow-hidden rounded-sm border border-white/10 bg-mesa-stone md:mb-4 ${
                index % 3 === 0 ? 'md:mt-8' : ''
              }`}
            >
              {item.imageUrl ? (
                <HomeV2MediaFrame
                  src={item.imageUrl}
                  alt={`Mesa de ${item.name}`}
                  sizes="(min-width: 768px) 30vw, 45vw"
                  ratioClassName={index % 2 === 0 ? 'aspect-[4/5]' : 'aspect-square'}
                />
              ) : null}
              <figcaption className="p-4">
                <blockquote className="text-sm leading-relaxed text-mesa-parchment">
                  “{item.quote}”
                </blockquote>
                <p className="mt-3 text-sm text-mesa-ash">
                  {item.name}
                  {item.context ? ` · ${item.context}` : ''}
                </p>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
