import { redirect } from 'next/navigation';
import { STORE_ROUTES } from '@/lib/store/routes';

export default function DashboardLojaRedirect() {
  redirect(STORE_ROUTES.home);
}
