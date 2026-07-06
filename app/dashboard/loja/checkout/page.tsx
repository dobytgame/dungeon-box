import { redirect } from 'next/navigation';
import { STORE_ROUTES } from '@/lib/store/routes';

export default function DashboardLojaCheckoutRedirect() {
  redirect(STORE_ROUTES.checkout);
}
