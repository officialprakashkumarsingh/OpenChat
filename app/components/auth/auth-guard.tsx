'use client';

import { useEffect, useState } from 'react';
import { Authenticated, AuthLoading, Unauthenticated } from 'convex/react';
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

export function AuthGuard({ children }: AuthGuardProps) {
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const [loadingTime, setLoadingTime] = useState(0);
  const [forceBypass, setForceBypass] = useState(false);

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
                Unable to connect to backend. Some features may not work properly.
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
                 {loadingTime > 20 && (
                   <button
                     onClick={() => setForceBypass(true)}
                     className="mt-2 px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                   >
                     Continue without backend
                   </button>
                 )}
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
