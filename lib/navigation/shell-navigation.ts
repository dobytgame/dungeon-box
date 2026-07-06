'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

export type ShellScope = '/admin' | '/dashboard' | '/loja';

export type ShellNavigationPhase = 'idle' | 'loading' | 'completing';

function isModifiedClick(event: MouseEvent) {
  return (
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  );
}

function isSameShellNavigation(
  href: string,
  pathname: string,
  scope: ShellScope
): boolean {
  if (!href || href.startsWith('#')) return false;

  try {
    const url = new URL(href, window.location.origin);
    if (url.origin !== window.location.origin) return false;
    if (!url.pathname.startsWith(scope)) return false;

    const next = `${url.pathname}${url.search}`;
    const current = `${pathname}${window.location.search}`;
    return next !== current;
  } catch {
    return href.startsWith(scope) && href !== pathname;
  }
}

export function useShellNavigation(scope: ShellScope) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchKey = searchParams.toString();

  const [phase, setPhase] = useState<ShellNavigationPhase>('idle');
  const [progress, setProgress] = useState(0);

  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hideRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startedRef = useRef(false);

  const clearTimers = useCallback(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
    if (hideRef.current) {
      clearTimeout(hideRef.current);
      hideRef.current = null;
    }
  }, []);

  const startLoading = useCallback(() => {
    clearTimers();
    startedRef.current = true;
    setPhase('loading');
    setProgress(14);

    tickRef.current = setInterval(() => {
      setProgress((value) => {
        if (value >= 90) return value;
        return value + 4 + Math.random() * 6;
      });
    }, 320);
  }, [clearTimers]);

  const finishLoading = useCallback(() => {
    clearTimers();
    setPhase('completing');
    setProgress(100);

    hideRef.current = setTimeout(() => {
      setPhase('idle');
      setProgress(0);
    }, 260);
  }, [clearTimers]);

  useEffect(() => {
    if (!startedRef.current) return;
    startedRef.current = false;
    finishLoading();
  }, [pathname, searchKey, finishLoading]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || isModifiedClick(event)) return;

      const anchor = (event.target as Element).closest('a');
      if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) {
        return;
      }

      const href = anchor.getAttribute('href');
      if (!href || !isSameShellNavigation(href, pathname, scope)) return;

      startLoading();
    };

    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [pathname, scope, startLoading]);

  useEffect(() => clearTimers, [clearTimers]);

  return {
    phase,
    progress,
    isNavigating: phase !== 'idle',
  };
}
