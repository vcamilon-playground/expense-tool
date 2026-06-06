import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Expense Tool',
    short_name: 'Expenses',
    description: 'Track expenses, income, budgets, recurring payments, and reports.',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#eef3fd',
    theme_color: '#3b6fd4',
    categories: ['finance', 'productivity'],
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
    ],
  };
}
