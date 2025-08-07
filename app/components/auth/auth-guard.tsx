'use client';

import { useEffect, useMemo, useState } from 'react';
import { Authenticated, AuthLoading, Unauthenticated, useConvexAuth } from 'convex/react';
import { ChatSessionProvider } from '@/app/providers/chat-session-provider';
import { CSPostHogProvider } from '@/app/providers/posthog-provider';
import { ThemeProvider } from '@/app/providers/theme-provider';
import { UserProvider } from '@/app/providers/user-provider';
import { Loader } from '@/components/prompt-kit/loader';
import { Toaster } from '@/components/ui/sonner';
import { AnonymousSignIn } from './anonymous-sign-in';

interface AuthGuardProps {
  children: React.ReactNode;
}

function AutoBypassOnTimeout({ onTimeout, ms }: { onTimeout: () => void; ms: number }) {
  useEffect(() => {
    const id = setTimeout(onTimeout, ms);
    return () => clearTimeout(id);
  }, [onTimeout, ms]);
  return null;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { isLoading: authIsLoading, isAuthenticated } = useConvexAuth();
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const [loadingTime, setLoadingTime] = useState(0);
  // Auto-bypass when Convex URL is not configured
  const convexConfigured = Boolean(process.env.NEXT_PUBLIC_CONVEX_URL);
  const initialBypass = useMemo(() => {
    if (!convexConfigured) return true;
    if (typeof window === 'undefined') return false;
    const urlHasBypass = new URLSearchParams(window.location.search).get('bypass') === '1';
    const lsBypass = window.localStorage.getItem('oc_bypass_backend') === '1';
    return urlHasBypass || lsBypass;
  }, [convexConfigured]);
  const [forceBypass, setForceBypass] = useState(initialBypass);

  // Persist bypass choice in localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (forceBypass) {
      window.localStorage.setItem('oc_bypass_backend', '1');
    }
  }, [forceBypass]);

  // Global safety timer: if auth stays loading for 15s, bypass
  useEffect(() => {
    if (forceBypass || !convexConfigured) return;
    if (!authIsLoading) return; // only arm when actually loading
    const id = setTimeout(() => setForceBypass(true), 15000);
    return () => clearTimeout(id);
  }, [authIsLoading, convexConfigured, forceBypass]);

  // Show debug info after 10 seconds of loading
  useEffect(() => {
    const timer = setInterval(() => {
      setLoadingTime(prev => {
        if (prev >= 10) {
          setShowDebugInfo(true);
        }
        return prev + 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // If loading takes too long, allow bypass
  if (forceBypass) {
    return (
      <ThemeProvider>
        <div className="min-h-screen bg-background p-4">
          <div className="max-w-2xl mx-auto">
            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg mb-4">
              <h2 className="font-semibold text-yellow-800">Connection Issue Detected</h2>
              <p className="text-sm text-yellow-700 mt-1">
                {convexConfigured
                  ? 'Unable to connect to backend. Some features may not work properly.'
                  : 'Backend not configured (NEXT_PUBLIC_CONVEX_URL missing). Running in limited mode.'}
              </p>
            </div>
            {children}
          </div>
        </div>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      {/* Auth Loading State - UserProvider never executes */}
      <AuthLoading>
        <div className="flex h-dvh items-center justify-center bg-background">
          <div className="flex flex-col items-center space-y-4">
            <Loader size="lg" variant="dots" />
            {/* Auto-bypass after 20s only if still loading */}
            <AutoBypassOnTimeout ms={20000} onTimeout={() => setForceBypass(true)} />
            {showDebugInfo && (
              <div className="text-center space-y-2 max-w-md px-4">
                <p className="text-sm text-muted-foreground">
                  Loading is taking longer than expected...
                </p>
                <p className="text-xs text-muted-foreground">
                  Loading for {loadingTime} seconds
                </p>
                <div className="text-xs text-left bg-muted p-3 rounded">
                  <p><strong>Possible issues:</strong></p>
                  <p>• Convex backend connection</p>
                  <p>• Environment variables missing</p>
                  <p>• Network connectivity</p>
                  <p><strong>Convex URL:</strong> {process.env.NEXT_PUBLIC_CONVEX_URL || 'Not set'}</p>
                </div>
                <button
                  onClick={() => setForceBypass(true)}
                  className="mt-2 px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                >
                  Continue without backend
                </button>
              </div>
            )}
          </div>
        </div>
      </AuthLoading>

      {/* Unauthenticated State - Triggers anonymous sign-in */}
      <Unauthenticated>
        <AnonymousSignIn />
      </Unauthenticated>

      {/* Authenticated State - Covers both Google users AND anonymous users */}
      <Authenticated>
        <UserProvider>
          <CSPostHogProvider>
            <ChatSessionProvider>
              <Toaster position="top-center" />
              {children}
            </ChatSessionProvider>
          </CSPostHogProvider>
        </UserProvider>
      </Authenticated>
    </ThemeProvider>
  );
}
