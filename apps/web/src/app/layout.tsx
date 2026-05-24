import './globals.css';
import type { Metadata } from 'next';
import Link from 'next/link';
import ThemeToggle from '@/components/ThemeToggle';

export const metadata: Metadata = {
  title: 'Expense Tool',
  description: 'Track expenses, scan receipts, see monthly AI insights',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `try{var t=localStorage.getItem('theme');if(t)document.documentElement.setAttribute('data-theme',t);}catch(e){}` }} />
      </head>
      <body>
        <nav className="topnav">
          <span className="brand">💸 Expenses</span>
          <Link href="/">Dashboard</Link>
          <Link href="/expenses">Expenses</Link>
          <Link href="/reports">Reports</Link>
          <Link href="/budgets">Budgets</Link>
          <Link href="/recurring">Recurring</Link>
          <ThemeToggle />
        </nav>
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
