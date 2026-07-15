import { getPublicTestimonials } from '@/lib/feedback/public';
import DepoimentosGrid from '@/components/sections/DepoimentosGrid';

export default async function Depoimentos() {
  const testimonials = await getPublicTestimonials();

  if (testimonials.length === 0) return null;

  return <DepoimentosGrid testimonials={testimonials} />;
}
