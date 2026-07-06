'use client';

import { Suspense, type ReactNode } from 'react';
import {
  type ShellScope,
  useShellNavigation,
} from '@/lib/navigation/shell-navigation';

interface Props {
  scope: ShellScope;
  variant: 'admin' | 'dashboard' | 'shop';
  children: ReactNode;
}

function ShellNavigationFrameInner({ scope, variant, children }: Props) {
  const { phase, progress, isNavigating } = useShellNavigation(scope);

  const barClassName =
    variant === 'admin'
      ? 'bg-console shadow-[0_0_12px_rgba(45,212,191,0.55)]'
      : 'bg-gradient-to-r from-ember via-[#ff9060] to-frost shadow-[0_0_14px_rgba(255,107,43,0.45)]';

  const barZIndex = variant === 'shop' ? 'z-[250]' : 'z-[100]';

  const showBar = phase !== 'idle' || progress > 0;

  return (
    <>
      {showBar ? (
        <div
          className={`pointer-events-none fixed inset-x-0 top-0 ${barZIndex} h-[2px] overflow-hidden bg-zinc-900/80`}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress)}
          aria-label="Carregando página"
        >
          <div
            className={`h-full origin-left transition-[width,opacity] duration-200 ease-out motion-reduce:transition-none ${barClassName} ${
              phase === 'completing' ? 'opacity-0' : 'opacity-100'
            }`}
            style={{ width: `${progress}%` }}
          />
          {variant === 'admin' ? (
            <div
              className="absolute inset-y-0 w-16 bg-gradient-to-r from-transparent via-white/35 to-transparent motion-reduce:hidden"
              style={{
                left: `${Math.max(progress - 8, 0)}%`,
                opacity: phase === 'loading' ? 1 : 0,
                transition: 'left 200ms ease-out, opacity 200ms',
              }}
              aria-hidden="true"
            />
          ) : null}
        </div>
      ) : null}

      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {isNavigating ? 'Carregando página…' : 'Página carregada.'}
      </p>

      <div
        className={`shell-nav-content transition-[opacity,filter] duration-200 motion-reduce:transition-none ${
          isNavigating ? 'pointer-events-none opacity-[0.72] saturate-[0.92]' : 'opacity-100'
        }`}
      >
        {children}
      </div>
    </>
  );
}

export default function ShellNavigationFrame(props: Props) {
  return (
    <Suspense fallback={props.children}>
      <ShellNavigationFrameInner {...props} />
    </Suspense>
  );
}
