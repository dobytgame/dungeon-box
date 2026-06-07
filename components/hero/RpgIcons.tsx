type IconProps = {
  className?: string;
};

const glow = (id: string, color: string) => (
  <filter id={id} x="-50%" y="-50%" width="200%" height="200%">
    <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor={color} floodOpacity="0.55" />
  </filter>
);

export function D20Icon({
  className = '',
  variant = 'ember',
}: IconProps & { variant?: 'ember' | 'frost' | 'gold' }) {
  const fills = {
    ember: { face: '#ff6b2b', edge: '#ff9060', glow: '#ff6b2b' },
    frost: { face: '#00d4ff', edge: '#80eaff', glow: '#00d4ff' },
    gold: { face: '#ffd600', edge: '#ffe566', glow: '#ffd600' },
  }[variant];
  const filterId = `d20-glow-${variant}`;

  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {glow(filterId, fills.glow)}
      <polygon
        points="32,4 58,20 58,44 32,60 6,44 6,20"
        fill={fills.face}
        fillOpacity="0.25"
        stroke={fills.edge}
        strokeWidth="2"
        filter={`url(#${filterId})`}
      />
      <polygon
        points="32,4 58,20 32,32 6,20"
        fill={fills.face}
        fillOpacity="0.45"
        stroke={fills.edge}
        strokeWidth="1.5"
      />
      <polygon
        points="32,32 58,20 58,44 32,60"
        fill={fills.face}
        fillOpacity="0.35"
        stroke={fills.edge}
        strokeWidth="1.5"
      />
      <polygon
        points="32,32 6,20 6,44 32,60"
        fill={fills.face}
        fillOpacity="0.3"
        stroke={fills.edge}
        strokeWidth="1.5"
      />
      <text
        x="32"
        y="36"
        textAnchor="middle"
        fill={fills.edge}
        fontSize="14"
        fontWeight="bold"
        fontFamily="system-ui, sans-serif"
      >
        20
      </text>
    </svg>
  );
}

export function SwordIcon({ className = '' }: IconProps) {
  return (
    <svg
      viewBox="0 0 48 96"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {glow('sword-glow', '#a0aabb')}
      <path
        d="M24 4 L28 52 L20 52 Z"
        fill="#c8cdd8"
        stroke="#e8ecf4"
        strokeWidth="1.5"
        filter="url(#sword-glow)"
      />
      <rect x="18" y="52" width="12" height="6" rx="1" fill="#8b6914" stroke="#ffd600" strokeWidth="1" />
      <rect x="20" y="58" width="8" height="14" rx="1" fill="#4a3728" stroke="#6b4f3a" strokeWidth="1" />
      <circle cx="24" cy="76" r="6" fill="#ffd600" fillOpacity="0.9" stroke="#ffe566" strokeWidth="1.5" />
    </svg>
  );
}

export function CoinIcon({ className = '' }: IconProps) {
  return (
    <svg
      viewBox="0 0 56 56"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {glow('coin-glow', '#ffd600')}
      <ellipse cx="28" cy="30" rx="22" ry="8" fill="#b8860b" fillOpacity="0.5" />
      <circle cx="28" cy="24" r="20" fill="#ffd600" fillOpacity="0.35" stroke="#ffe566" strokeWidth="2" filter="url(#coin-glow)" />
      <text x="28" y="30" textAnchor="middle" fill="#ffe566" fontSize="16" fontWeight="bold">
        $
      </text>
    </svg>
  );
}

export function ScrollIcon({ className = '' }: IconProps) {
  return (
    <svg
      viewBox="0 0 64 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {glow('scroll-glow', '#00d4ff')}
      <path
        d="M8 8 C8 4 12 2 16 4 L48 4 C52 2 56 4 56 8 L56 40 C56 44 52 46 48 44 L16 44 C12 46 8 44 8 40 Z"
        fill="#d4c4a8"
        fillOpacity="0.35"
        stroke="#e8dcc8"
        strokeWidth="1.5"
        filter="url(#scroll-glow)"
      />
      <path d="M20 14 L44 14 M20 22 L40 22 M20 30 L36 30" stroke="#c4b498" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function PotionIcon({ className = '' }: IconProps) {
  return (
    <svg
      viewBox="0 0 40 56"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {glow('potion-glow', '#ff6b2b')}
      <rect x="14" y="4" width="12" height="8" rx="2" fill="#8b6914" stroke="#c4a035" strokeWidth="1" />
      <path
        d="M12 14 H28 L32 48 C32 52 28 54 20 54 C12 54 8 52 8 48 Z"
        fill="#ff6b2b"
        fillOpacity="0.4"
        stroke="#ff9060"
        strokeWidth="1.5"
        filter="url(#potion-glow)"
      />
      <ellipse cx="20" cy="22" rx="6" ry="3" fill="#ff9060" fillOpacity="0.5" />
    </svg>
  );
}
