'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './black-friday.module.css';

const units = [
  ['dias', 86_400, Infinity],
  ['horas', 3_600, 24],
  ['min', 60, 60],
  ['seg', 1, 60],
] as const;

function splitTime(seconds: number) {
  return units.map(([unit, divisor, limit]) => ({
    unit,
    value: String(Math.floor(seconds / divisor) % limit).padStart(2, '0'),
  }));
}

function spokenTime(seconds: number) {
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor(seconds / 3_600) % 24;
  const minutes = Math.floor(seconds / 60) % 60;
  return `${days} dias, ${hours} horas e ${minutes} minutos`;
}

export default function Countdown({
  initialNow,
  target,
  label,
  compact = false,
}: {
  initialNow: number;
  target: number;
  label: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [now, setNow] = useState(initialNow);

  useEffect(() => {
    const started = performance.now();
    const timer = window.setInterval(() => {
      const current = initialNow + performance.now() - started;
      setNow(current);

      if (current >= target) {
        window.clearInterval(timer);
        router.refresh();
      }
    }, 1000);

    return () => window.clearInterval(timer);
  }, [initialNow, target, router]);

  const seconds = Math.max(0, Math.ceil((target - now) / 1000));
  const parts = splitTime(seconds);

  if (compact) {
    return (
      <span className={styles.timerCompact} aria-hidden="true">
        {parts.map(({ unit, value }) => (
          <span key={unit}>
            {value}
            <small>{unit.charAt(0)}</small>
          </span>
        ))}
      </span>
    );
  }

  return (
    <div className={styles.countdown}>
      <span className={styles.timerLabel}>{label}</span>
      <div className={styles.timer} aria-hidden="true">
        {parts.map(({ unit, value }) => (
          <span key={unit} className={styles.timerCell}>
            <strong key={value} className={styles.timerDigit}>
              {value}
            </strong>
            <small>{unit}</small>
          </span>
        ))}
      </div>
      <span className={styles.srOnly} aria-live="polite">
        {`${label}: ${spokenTime(Math.floor(seconds / 60) * 60)}`}
      </span>
    </div>
  );
}
