'use client';

import GuildLpCta from '@/components/guild-lp/GuildLpCta';
import { trackGuildSupportClick } from '@/lib/guild-lp/analytics';
import { guildSupportWhatsAppUrl } from '@/lib/guild-lp/support-url';

interface Props {
  children: React.ReactNode;
  position?: string;
  planName?: string;
  variant?: 'primary' | 'secondary';
  className?: string;
}

export default function GuildLpSupportLink({
  children,
  position = 'support',
  planName,
  variant = 'secondary',
  className = '',
}: Props) {
  const href = guildSupportWhatsAppUrl(planName);

  return (
    <GuildLpCta
      href={href}
      external
      variant={variant}
      className={className}
      onClick={() => trackGuildSupportClick(position, planName)}
    >
      {children}
    </GuildLpCta>
  );
}
