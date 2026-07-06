import { redirect } from 'next/navigation';
import { STORE_ROUTES } from '@/lib/store/routes';

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function DashboardLojaProductRedirect({ params }: Props) {
  const { slug } = await params;
  redirect(STORE_ROUTES.product(slug));
}
