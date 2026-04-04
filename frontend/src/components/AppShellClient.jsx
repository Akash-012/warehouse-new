'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { CommandPalette } from '@/components/ui/CommandPalette';

const PUBLIC_ROUTES = ['/login', '/guide'];

export default function AppShellClient({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);
  const [isAuthorized, setIsAuthorized] = useState(isPublicRoute);

  useEffect(() => {
    if (isPublicRoute) {
      setIsAuthorized(true);
      return;
    }

    const token = localStorage.getItem('wms_token');
    if (!token) {
      setIsAuthorized(false);
      router.replace('/login');
      return;
    }

    setIsAuthorized(true);
  }, [isPublicRoute, router, pathname]);

  if (isPublicRoute) return <>{children}</>;

  if (!isAuthorized) return null;

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <CommandPalette onNavigate={(href) => router.push(href)} />
      <Sidebar />
      <main className="flex-1 overflow-x-hidden">
        <div className="min-h-screen px-4 pt-3 pb-5 sm:px-6 sm:pt-3 sm:pb-6 md:px-8 md:pt-3 md:pb-7">
          {children}
        </div>
      </main>
    </div>
  );
}
