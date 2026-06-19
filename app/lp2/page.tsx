import { permanentRedirect } from 'next/navigation';

/** LP de vendas migrou para a home (`/`). */
export default function LegacySalesLandingPage() {
  permanentRedirect('/');
}
