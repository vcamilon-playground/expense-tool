export const DEFAULT_CATEGORIES = [
  { name: 'Groceries', icon: '🛒' },
  { name: 'Dining', icon: '🍽️' },
  { name: 'Transport', icon: '🚗' },
  { name: 'Utilities', icon: '💡' },
  { name: 'Rent', icon: '🏠' },
  { name: 'Entertainment', icon: '🎬' },
  { name: 'Shopping', icon: '🛍️' },
  { name: 'Health', icon: '💊' },
  { name: 'Travel', icon: '✈️' },
  { name: 'Subscriptions', icon: '🔁' },
  { name: 'Education', icon: '📚' },
  { name: 'Other', icon: '📦' },
] as const;

export type DefaultCategoryName = (typeof DEFAULT_CATEGORIES)[number]['name'];
