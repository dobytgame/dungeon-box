import { redirect } from 'next/navigation';
import { STORE_ROUTES } from '@/lib/store/routes';

export default function DashboardLojaCartRedirect() {
  redirect(STORE_ROUTES.cart);
}
