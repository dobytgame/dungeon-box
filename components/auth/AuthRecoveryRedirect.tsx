'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import {
  PASSWORD_RESET_PATH,
  getRecoveryHashParams,
} from '@/lib/auth/recovery-session';

/**
 * Supabase às vezes redireciona para a Site URL (/) com #access_token&type=recovery
 * quando o redirectTo não está na allow list. Encaminha para /auth/nova-senha.
 */
export default function AuthRecoveryRedirect() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const hashParams = getRecoveryHashParams();
    if (!hashParams) return;
    if (pathname === PASSWORD_RESET_PATH) return;

    router.replace(`${PASSWORD_RESET_PATH}${window.location.hash}`);
  }, [pathname, router]);

  return null;
}
