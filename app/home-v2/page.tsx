import { permanentRedirect } from 'next/navigation';

/** LP2 migrou para a home (`/`). */
export default function LegacyHomeV2Path() {
  permanentRedirect('/');
}
