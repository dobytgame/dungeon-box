import {
  Camera,
  Gift,
  Home,
  MapPin,
  Package,
  Repeat,
  Star,
  Store,
  User,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

const ICONS: Record<string, LucideIcon> = {
  home: Home,
  subscription: Repeat,
  package: Package,
  star: Star,
  camera: Camera,
  shop: Store,
  payment: Wallet,
  user: User,
  map: MapPin,
  gift: Gift,
};

export default function DashboardNavIcon({
  name,
  className = 'size-4',
}: {
  name: string;
  className?: string;
}) {
  const Icon = ICONS[name] ?? Home;
  return <Icon className={className} strokeWidth={1.75} aria-hidden="true" />;
}
