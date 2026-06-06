'use client';

import { usePathname } from 'next/navigation';
import NavBar from './NavBar';

const AUTH_PATHS = ['/login', '/register'];

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
        <main className="container">{children}</main>
        <footer className="site-footer">
          Created by Vegil Camilon &amp; Claude Code
          <span className="footer-version">
            v{process.env.NEXT_PUBLIC_APP_VERSION} · {process.env.NEXT_PUBLIC_BUILD_SHA}
          </span>
        </footer>
      </div>
    </div>
  );
}
