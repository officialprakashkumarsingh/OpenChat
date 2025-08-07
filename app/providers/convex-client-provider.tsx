'use client';
import { ConvexAuthNextjsProvider } from '@convex-dev/auth/nextjs';
import { ConvexQueryClient } from '@convex-dev/react-query';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ConvexReactClient } from 'convex/react';
import { useState } from 'react';

// Validate environment variable early for clearer error messaging
const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

// Make Convex optional: if no URL, skip Convex provider entirely
const client = convexUrl ? new ConvexReactClient(convexUrl) : null;

export function ConvexClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // If Convex is not configured, render children directly (limited functionality)
  if (!client) {
    return <>{children}</>;
  }

  const [queryClient] = useState(() => {
    const convexQueryClient = new ConvexQueryClient(client);

    const tanstackQueryClient = new QueryClient({
      defaultOptions: {
        queries: {
          // Convex query configuration
          queryKeyHashFn: convexQueryClient.hashFn(),
          queryFn: convexQueryClient.queryFn(),
          // Cache time: Data stays in cache for 10 minutes after becoming unused
          gcTime: 10 * 60 * 1000,
        },
      },
    });

    // Connect ConvexQueryClient to QueryClient
    convexQueryClient.connect(tanstackQueryClient);

    return tanstackQueryClient;
  });

  return (
    <ConvexAuthNextjsProvider client={client}>
      <QueryClientProvider client={queryClient}>
        {children}
        {process.env.NODE_ENV === 'development' && <ReactQueryDevtools />}
      </QueryClientProvider>
    </ConvexAuthNextjsProvider>
  );
}
