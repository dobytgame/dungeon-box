'use client';

import GuildLpCta from '@/components/guild-lp/GuildLpCta';
import { trackGuildInviteClick } from '@/lib/guild-lp/analytics';

interface Props {
  href: string;
  children: React.ReactNode;
  position?: string;
  variant?: 'primary' | 'secondary';
  className?: string;
}

export default function GuildLpGuildInviteLink({
  href,
  children,
  position = 'guild_block',
  variant = 'primary',
  className = '',
}: Props) {
  return (
    <GuildLpCta
      href={href}
      external
      variant={variant}
      className={className}
      onClick={() => trackGuildInviteClick(position)}
    >
      {children}
    </GuildLpCta>
  );
}
