import type { IncomeTransactionKind, IncomeType } from '@expense/shared';

// Income transactions older than this are archived: hidden from the default
// history view but never deleted. Archival is applied lazily when the Income
// page loads (no cron required), so the cutoff stays freeware-friendly.
export const ARCHIVE_AFTER_MONTHS = 3;

const TYPE_FALLBACK: Record<IncomeType, string> = {
  bank: 'Bank',
  ewallet: 'E-Wallet',
  cash: 'Cash on Hand',
};

// The label stored on a transaction so the history survives source deletion.
// Mirrors the on-page sourceLabel: cash is always "Cash on Hand", everything
// else prefers the display alias, then the brand, then a type fallback.
export function incomeSourceLabel(source: {
  type: IncomeType;
  name: string | null;
  brand: string | null;
}): string {
  if (source.type === 'cash') return TYPE_FALLBACK.cash;
  return source.name || source.brand || TYPE_FALLBACK[source.type];
}

// The instant before which transactions are considered archived.
export function archiveCutoff(now: Date): Date {
  const cutoff = new Date(now);
  cutoff.setMonth(cutoff.getMonth() - ARCHIVE_AFTER_MONTHS);
  return cutoff;
}

export function isArchived(createdAt: string | Date, now: Date): boolean {
  const created = typeof createdAt === 'string' ? new Date(createdAt) : createdAt;
  return created.getTime() < archiveCutoff(now).getTime();
}

export const TRANSACTION_TYPE_LABELS: Record<IncomeTransactionKind, string> = {
  deduct: 'Deduction',
  add: 'Add Money',
  transfer: 'Transfer',
  edit: 'Balance Edit',
};

// Sign of the movement from the primary source's perspective: deductions and
// outgoing transfers reduce it, adds increase it, edits depend on the delta.
export function transactionSign(
  kind: IncomeTransactionKind,
  balanceBefore: number | null,
  balanceAfter: number | null,
): -1 | 0 | 1 {
  if (kind === 'add') return 1;
  if (kind === 'deduct' || kind === 'transfer') return -1;
  if (balanceBefore === null || balanceAfter === null) return 0;
  if (balanceAfter > balanceBefore) return 1;
  if (balanceAfter < balanceBefore) return -1;
  return 0;
}
