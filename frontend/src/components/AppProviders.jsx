'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import queryClient from '@/lib/queryClient';

export default function AppProviders({ children }) {
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
