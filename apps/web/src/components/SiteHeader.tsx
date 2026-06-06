'use client';

import { useAuth } from '@/contexts/AuthContext';
import ThemeToggle from './ThemeToggle';

export default function SiteHeader() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <div className="site-header">
      <p className="site-welcome">Welcome {user.first_name}!</p>
      <ThemeToggle />
    </div>
  );
}
