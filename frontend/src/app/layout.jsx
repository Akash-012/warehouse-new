import { Inter, JetBrains_Mono } from 'next/font/google';
import { cn } from '@/lib/utils';
import AppProviders from '@/components/AppProviders';
import AppShellClient from '@/components/AppShellClient';
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

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(inter.variable, jetbrainsMono.variable)}
    >
      <body className="font-sans antialiased">
        <AppProviders>
          <AppShellClient>{children}</AppShellClient>
        </AppProviders>
      </body>
    </html>
  );
}
