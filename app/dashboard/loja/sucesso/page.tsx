import { redirect } from 'next/navigation';
import { STORE_ROUTES } from '@/lib/store/routes';

interface Props {
  searchParams: Promise<{ order?: string }>;
}

export default async function DashboardLojaSuccessRedirect({ searchParams }: Props) {
  const { order } = await searchParams;
  redirect(STORE_ROUTES.success(order));
}
