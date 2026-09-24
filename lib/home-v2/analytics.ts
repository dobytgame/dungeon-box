import { pushDataLayer } from '@/lib/analytics/data-layer';
import { HOME_V2_VARIANT } from '@/lib/home-v2/content';

function track(event: string, properties: Record<string, unknown> = {}) {
  pushDataLayer({
    event,
    variant: HOME_V2_VARIANT,
    ...properties,
  });
}

export function trackHomeV2View(device: 'mobile' | 'desktop') {
  track('home_view', { origem: 'home-v2', dispositivo: device });
}

export function trackHomeV2HeroCta(position: string) {
  track('hero_cta_click', { posicao: position, origem: 'home-v2' });
}

export function trackHomeV2PlanViewed(plan: string) {
  track('plan_viewed', { plano: plan });
}

export function trackHomeV2PlanSelected(plan: string, price: number) {
  track('plan_selected', { plano: plan, preco: price });
}

export function trackHomeV2CheckoutStarted(plan: string) {
  track('checkout_started', { plano: plan, origem: 'home-v2' });
}

export function trackHomeV2StoreSectionViewed() {
  track('store_section_viewed', { origem: 'home-v2' });
}

export function trackHomeV2StoreProductClicked(sku: string, position: number) {
  track('store_product_clicked', { sku, posicao: position });
}

export function trackHomeV2TestimonialOpened(id: string, origin: 'card' | 'ver-todas') {
  track('testimonial_opened', { depoimento: id, origem: origin });
}

export function trackHomeV2PlanGalleryOpened(plan: string, photo: number) {
  track('plan_gallery_opened', { plano: plan, foto: photo });
}

export function trackHomeV2FaqOpened(question: string) {
  track('faq_opened', { pergunta: question });
}
