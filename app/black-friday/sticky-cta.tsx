'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import styles from './black-friday.module.css';

/** Barra de compra fixa no celular: aparece após o CTA do hero sair da tela e some sobre a oferta. */
export default function StickyCta({
  href,
  label,
  price,
  priceUnit = '/mês',
  children,
}: {
  href: string;
  label: string;
  price: string;
  /** Sufixo ao lado do valor (ex.: "+ frete" para o combo à vista). */
  priceUnit?: string;
  children?: ReactNode;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const heroCta = document.getElementById('hero-cta');
    const order = document.getElementById('oferta-card');
    if (!heroCta || !order) return;

    const seen = { hero: true, order: false };
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === heroCta) seen.hero = entry.isIntersecting;
        if (entry.target === order) seen.order = entry.isIntersecting;
      }
      setVisible(!seen.hero && !seen.order);
    });

    observer.observe(heroCta);
    observer.observe(order);
    return () => observer.disconnect();
  }, []);

  return (
    <div className={styles.sticky} data-visible={visible} aria-hidden={!visible}>
      <div className={styles.stickyInfo}>
        <strong>{price}<span>{priceUnit}</span></strong>
        {children}
      </div>
      <Link href={href} className={styles.stickyCta} tabIndex={visible ? 0 : -1}>
        {label}
        <ArrowRight size={18} aria-hidden="true" />
      </Link>
    </div>
  );
}
