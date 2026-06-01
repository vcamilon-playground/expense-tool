import './globals.css';
import type { Metadata } from 'next';
import { AuthProvider } from '@/contexts/AuthContext';
import ConditionalLayout from '@/components/ConditionalLayout';

export const metadata: Metadata = {
  title: 'Expense Tool',
  description: 'Track expenses, scan receipts, see monthly AI insights',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script dangerouslySetInnerHTML={{ __html: `try{var t=localStorage.getItem('theme');if(t)document.documentElement.setAttribute('data-theme',t);var a=localStorage.getItem('accent');if(a&&a!=='default')document.documentElement.setAttribute('data-accent',a);}catch(e){}` }} />
      </head>
      <body>
        <AuthProvider>
          <ConditionalLayout>{children}</ConditionalLayout>
        </AuthProvider>
      </body>
    </html>
  );
}
