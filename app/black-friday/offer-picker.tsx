'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import styles from './black-friday.module.css';

export type PickerOffer = {
  id: string;
  name: string;
  off: string;
  badge?: string;
  lines: { label: string; value: string; strike?: boolean; highlight?: boolean }[];
  totalLabel: string;
  total: string;
  totalNote: string;
  fine: string;
  href: string | null;
  cta: string;
};

/** Cupom com uma oferta por vez: o cliente alterna entre mensal e combo sem ver dois totais juntos. */
export default function OfferPicker({
  offers,
  defaultSelectedId,
}: {
  offers: PickerOffer[];
  /** Quando ausente, usa a primeira oferta da lista (normalmente o destaque da campanha). */
  defaultSelectedId?: string;
}) {
  const initialId =
    defaultSelectedId && offers.some((o) => o.id === defaultSelectedId)
      ? defaultSelectedId
      : offers[0].id;
  const [selectedId, setSelectedId] = useState(initialId);
  const offer = offers.find(({ id }) => id === selectedId) ?? offers[0];

  return (
    <div className={styles.picker}>
      <div className={styles.pickerTabs} role="radiogroup" aria-label="Escolha a oferta">
        {offers.map(({ id, name, off, badge }) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={id === offer.id}
            className={`${styles.pickerTab}${id === 'combo' ? ` ${styles.pickerTabHero}` : ''}`}
            onClick={() => setSelectedId(id)}
          >
            {badge && <span className={styles.pickerBadge}>{badge}</span>}
            <span className={styles.pickerName}>{name}</span>
            <span className={styles.pickerOff}>{off}</span>
          </button>
        ))}
      </div>

      <div key={offer.id} className={styles.pickerBody} aria-live="polite">
        <dl className={styles.receiptLines}>
          {offer.lines.map(({ label, value, strike, highlight }) => (
            <div key={label} className={highlight ? styles.receiptBonus : undefined}>
              <dt>{label}</dt>
              <dd>{strike ? <s>{value}</s> : value}</dd>
            </div>
          ))}
        </dl>

        <div className={styles.receiptTotal}>
          <span>{offer.totalLabel}</span>
          <strong>
            {offer.total}
            <small>{offer.totalNote}</small>
          </strong>
        </div>
        <p className={`${styles.receiptFine} ${styles.pickerFine}`}>{offer.fine}</p>

        {offer.href ? (
          <Link href={offer.href} className={`${styles.cta} ${styles.receiptCta}`}>
            <span>{offer.cta}</span>
            <ArrowRight size={20} aria-hidden="true" />
          </Link>
        ) : (
          <span className={`${styles.cta} ${styles.receiptCta} ${styles.ctaLocked}`}>
            <span>Abre em breve</span>
          </span>
        )}
      </div>
    </div>
  );
}
