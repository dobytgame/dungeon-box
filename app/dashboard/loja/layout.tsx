import { StoreCartProvider } from '@/components/store/StoreCartProvider';

export default function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <StoreCartProvider>{children}</StoreCartProvider>;
}
