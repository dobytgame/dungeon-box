const STEPS = [
  { id: 1, label: 'Resumo' },
  { id: 2, label: 'Entrega' },
  { id: 3, label: 'Pagamento' },
] as const;

interface Props {
  currentStep: 1 | 2 | 3;
  className?: string;
}

export default function CheckoutStepper({ currentStep, className = '' }: Props) {
  return (
    <nav
      className={`mb-8 flex items-center gap-2 sm:gap-4 ${className}`}
      aria-label="Etapas do checkout"
    >
      {STEPS.map((step, index) => {
        const done = step.id < currentStep;
        const active = step.id === currentStep;

        return (
          <div key={step.id} className="flex min-w-0 flex-1 items-center gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-display text-xs ${
                  active
                    ? 'bg-ember text-stone-950'
                    : done
                      ? 'bg-ember/20 text-ember'
                      : 'border border-white/15 text-stone-500'
                }`}
                aria-current={active ? 'step' : undefined}
              >
                {step.id}
              </span>
              <span
                className={`truncate font-display text-[9px] uppercase tracking-widest max-[380px]:inline sm:hidden ${
                  active ? 'text-white' : 'text-stone-500'
                }`}
              >
                {step.label}
              </span>
              <span
                className={`hidden truncate font-display text-[10px] uppercase tracking-widest sm:inline ${
                  active ? 'text-white' : 'text-stone-500'
                }`}
              >
                {step.label}
              </span>
            </div>
            {index < STEPS.length - 1 ? (
              <div
                className={`h-px min-w-[1rem] flex-1 ${
                  done ? 'bg-ember/40' : 'bg-white/10'
                }`}
                aria-hidden="true"
              />
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}
