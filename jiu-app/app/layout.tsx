'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useGlobalStore } from '@/stores/globalStore';
import {
  getLocalGuestId,
  readLocalAuthState,
  saveLocalAuthState,
} from '@/lib/auth/session';
import type { AuthState } from '@/lib/auth/types';
import { BottomNav } from '@/components/layout/BottomNav';
import { BirdCompanion } from '@/components/layout/BirdCompanion';
import { Onboarding } from '@/components/shared/Onboarding';
import './globals.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const { init } = useGlobalStore();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (pathname === '/login') {
      setMounted(true);
      return;
    }
    let cancelled = false;

    void (async () => {
      let authState = readLocalAuthState();
      if (!authState.user || authState.source === 'local') {
        try {
          const response = await fetch('/api/auth/guest', { method: 'POST' });
          if (response.ok) {
            const payload = await response.json() as {
              user?: AuthState['user'];
              session?: AuthState['session'];
            };
            if (payload.user) {
              authState = {
                user: payload.user,
                session: payload.session ?? null,
                source: 'server',
              } satisfies AuthState;
              saveLocalAuthState(authState);
            }
          }
        } catch {
          // Keep the local guest fallback when the API is temporarily unavailable.
        }
      }

      if (cancelled) return;
      if (!authState.user) {
        authState = {
          user: { id: getLocalGuestId(), type: 'guest' },
          session: null,
          source: 'local',
        } satisfies AuthState;
        saveLocalAuthState(authState);
      }

      init(authState);
      setMounted(true);
      const onboarded = localStorage.getItem('jiu_onboarded');
      if (!onboarded) setShowOnboarding(true);
    })();

    return () => { cancelled = true; };
  }, [init, pathname]);

  if (!mounted) {
    return (
      <html lang="zh-CN">
        <body className="bg-[#FFF8F0]">
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-4xl animate-bounce">🐦</div>
          </div>
        </body>
      </html>
    );
  }

  return (
    <html lang="zh-CN">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <title>啾 · 儿童 AI 音乐创作</title>
      </head>
      <body className="bg-[#FFF8F0] w-full max-w-6xl mx-auto relative min-h-screen">
        {showOnboarding && <Onboarding onComplete={() => setShowOnboarding(false)} />}
        {children}
        {pathname !== '/login' && <BottomNav />}
        {pathname !== '/login' && <BirdCompanion />}
      </body>
    </html>
  );
}
