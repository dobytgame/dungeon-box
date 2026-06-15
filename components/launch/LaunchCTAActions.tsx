import CTAButton from '@/components/ui/CTAButton';
import { WHATSAPP_GUILD_URL, launchCopy } from '@/lib/launch/constants';

interface Props {
  align?: 'start' | 'center';
  className?: string;
}

export default function LaunchCTAActions({
  align = 'start',
  className = '',
}: Props) {
  const alignClass = align === 'center' ? 'items-center' : 'items-start';

  return (
    <div className={`flex flex-col ${alignClass} ${className}`}>
      <CTAButton
        label={launchCopy.ctaPrimary}
        size="lg"
        href={WHATSAPP_GUILD_URL}
        external
        className="w-full border-glow-ember shadow-[0_8px_32px_rgba(255,107,43,0.25)] sm:w-auto"
      />
    </div>
  );
}
