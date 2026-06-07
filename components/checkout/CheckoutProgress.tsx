import { Check, CreditCard, MapPin, Package } from 'lucide-react';

const STEPS = [
  { label: 'Plano', icon: Package },
  { label: 'Entrega', icon: MapPin },
  { label: 'Pagamento', icon: CreditCard },
] as const;

interface Props {
  step: number;
}

export default function CheckoutProgress({ step }: Props) {
  return (
    <nav aria-label="Progresso do checkout" className="mb-8 md:mb-10">
      <ol className="flex items-center">
        {STEPS.map((item, i) => {
          const index = i + 1;
          const active = step === index;
          const done = step > index;
          const Icon = item.icon;

          return (
            <li
              key={item.label}
              className={`flex items-center ${i < STEPS.length - 1 ? 'flex-1' : ''}`}
            >
              <div className="flex flex-col items-center gap-2">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full border transition-colors duration-200 ${
                    done
                      ? 'border-ember/50 bg-ember/15 text-ember'
                      : active
                        ? 'border-ember bg-ember/20 text-ember shadow-[0_0_20px_rgba(255,107,43,0.2)]'
                        : 'border-white/10 bg-stone-950/80 text-stone-600'
                  }`}
                  aria-current={active ? 'step' : undefined}
                >
                  {done ? (
                    <Check className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  )}
                </div>
                <span
                  className={`hidden font-display text-[10px] uppercase tracking-[0.2em] sm:block ${
                    active ? 'text-ember' : done ? 'text-stone-400' : 'text-stone-600'
                  }`}
                >
                  {item.label}
                </span>
              </div>

              {i < STEPS.length - 1 ? (
                <div
                  className="mx-2 mb-6 h-px flex-1 sm:mx-3"
                  aria-hidden="true"
                >
                  <div
                    className={`h-full transition-all duration-500 ${
                      done ? 'bg-ember/40' : 'bg-white/[0.06]'
                    }`}
                  />
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
