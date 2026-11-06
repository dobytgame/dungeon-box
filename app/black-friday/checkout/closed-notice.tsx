import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import styles from './checkout.module.css';

type Reason = 'upcoming' | 'closed' | 'unavailable' | 'subscribed';

const copy: Record<Reason, { title: string; text: string; href: string; action: string }> = {
  upcoming: {
    title: 'Ainda não abriu',
    text: 'O checkout da Black Friday abre em breve. Volte em alguns instantes.',
    href: '/black-friday',
    action: 'Voltar para a oferta',
  },
  closed: {
    title: 'A Black acabou',
    text: 'A oferta valeu até 30 de novembro. O Lendário continua disponível pelo preço normal.',
    href: '/#planos',
    action: 'Ver os planos',
  },
  unavailable: {
    title: 'Checkout indisponível',
    text: 'Não conseguimos abrir o pagamento agora. Tente de novo em alguns minutos.',
    href: '/black-friday',
    action: 'Voltar para a oferta',
  },
  subscribed: {
    title: 'Você já é Lendário',
    text: 'Sua conta já tem uma assinatura do Lendário, por isso o preço da Black não se aplica.',
    href: '/dashboard/subscription',
    action: 'Ver minha assinatura',
  },
};

export default function ClosedNotice({ reason }: { reason: Reason }) {
  const { title, text, href, action } = copy[reason];
  return (
    <main className={styles.page}>
      <div className={styles.notice}>
        <p className={styles.eyebrow}>Black Friday 2026</p>
        <h1>{title}</h1>
        <p>{text}</p>
        <Link href={href} className={styles.payButton}>
          <ArrowLeft size={18} aria-hidden="true" />
          {action}
        </Link>
      </div>
    </main>
  );
}
