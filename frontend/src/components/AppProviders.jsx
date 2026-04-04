'use client';

import { useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import queryClient from '@/lib/queryClient';

const SESSION_MARKER = 'wms_session_initialized';

export default function AppProviders({ children }) {
  useEffect(() => {
    // Browser sessionStorage is cleared when all browser windows are closed.
    // On first load of a new session, clear client-side auth and query caches.
    const initialized = sessionStorage.getItem(SESSION_MARKER);
    if (!initialized) {
      localStorage.removeItem('wms_token');
      localStorage.removeItem('wms_username');
      localStorage.removeItem('wms_role');
      localStorage.removeItem('wms_permissions');
      queryClient.clear();
      sessionStorage.setItem(SESSION_MARKER, '1');
    }
  }, []);

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange
    >
      <QueryClientProvider client={queryClient}>
        <TooltipProvider delayDuration={200}>
          {children}
          <Toaster
            richColors
            position="top-right"
            toastOptions={{ style: { fontFamily: 'var(--font-sans)' } }}
          />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
