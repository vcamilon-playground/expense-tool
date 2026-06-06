import './globals.css';
import type { Metadata, Viewport } from 'next';
import { AuthProvider } from '@/contexts/AuthContext';
import { NavigationGuardProvider } from '@/contexts/NavigationGuardContext';
import ConditionalLayout from '@/components/ConditionalLayout';
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister';

export const metadata: Metadata = {
  applicationName: 'Expense Tool',
  title: 'Expense Tool',
  description: 'Track expenses, income, budgets, recurring payments, and reports.',
  icons: { icon: '/icon.svg' },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Expenses',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#3b6fd4',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `try{var t=localStorage.getItem('theme');if(t)document.documentElement.setAttribute('data-theme',t);var a=localStorage.getItem('accent');if(a&&a!=='default')document.documentElement.setAttribute('data-accent',a);}catch(e){}` }} />
      </head>
      <body>
        <NavigationGuardProvider>
          <AuthProvider>
            <ConditionalLayout>{children}</ConditionalLayout>
          </AuthProvider>
        </NavigationGuardProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
