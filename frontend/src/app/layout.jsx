'use client';

import { Inter, JetBrains_Mono } from 'next/font/google';
import { usePathname, useRouter } from 'next/navigation';
import { QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
import Sidebar from '../components/Sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';
import { CommandPalette } from '@/components/ui/CommandPalette';
import { cn } from '@/lib/utils';
import queryClient from '../lib/queryClient';
import './globals.css';

/** Inter — primary sans-serif, maps to --font-sans CSS var */
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

/** JetBrains Mono — monospace for barcodes & code, maps to --font-mono CSS var */
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
  weight: ['400', '500'],
});

const PUBLIC_ROUTES = ['/login'];

function AppShell({ children }) {
  const pathname = usePathname();
  const router   = useRouter();
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

  if (isPublicRoute) return <>{children}</>;

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <CommandPalette onNavigate={(href) => router.push(href)} />
      <Sidebar />
      <main className="flex-1 overflow-x-hidden">
        <div className="min-h-screen px-4 py-5 sm:px-6 sm:py-6">{children}</div>
      </main>
    </div>
  );
}

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(inter.variable, jetbrainsMono.variable)}
    >
      <body className="font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <QueryClientProvider client={queryClient}>
            <TooltipProvider delayDuration={200}>
              <AppShell>{children}</AppShell>
              <Toaster
                richColors
                position="top-right"
                toastOptions={{ style: { fontFamily: 'var(--font-sans)' } }}
              />
            </TooltipProvider>
          </QueryClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
