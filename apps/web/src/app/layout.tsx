import './globals.css';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Expense Tool',
  description: 'Track expenses, scan receipts, see monthly AI insights',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <nav className="topnav">
          <span className="brand">💸 Expenses</span>
          <Link href="/">Dashboard</Link>
          <Link href="/expenses">Expenses</Link>
          <Link href="/reports">Reports</Link>
          <Link href="/budgets">Budgets</Link>
          <Link href="/recurring">Recurring</Link>
        </nav>
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
