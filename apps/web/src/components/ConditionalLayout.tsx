'use client';

import { usePathname } from 'next/navigation';
import NavBar from './NavBar';
import SiteHeader from './SiteHeader';
import SiteFooter from './SiteFooter';

const AUTH_PATHS = ['/login', '/register', '/forgot-password', '/reset-password'];

export default function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = AUTH_PATHS.includes(pathname);

  if (isAuthPage) {
    return <>{children}</>;
  }

  return (
    <div className="app-layout">
      <NavBar />
      <div className="main-wrapper">
        <SiteHeader />
        <main className="container">{children}</main>
        <SiteFooter />
      </div>
    </div>
  );
}
