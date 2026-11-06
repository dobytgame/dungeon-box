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

export default function Countdown({
  initialNow,
  target,
  label,
}: {
  initialNow: number;
  target: number;
  label: string;
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

  return (
    <div className={styles.countdown}>
      <span className={styles.timerLabel}>{label}</span>
      <div className={styles.timer} aria-hidden="true">
        {units.map(([unit, divisor, limit]) => (
          <span key={unit}>
            <strong>{String(Math.floor(seconds / divisor) % limit).padStart(2, '0')}</strong>
            <small>{unit}</small>
          </span>
        ))}
      </div>
    </div>
  );
}
