import type { IncomeTransaction, IncomeTransactionKind, IncomeType } from '@expense/shared';

// Income transactions older than this are archived: hidden from the default
// history view but still retained. Archival is applied lazily when the history
// page loads (no cron required), so the cutoff stays freeware-friendly.
export const ARCHIVE_AFTER_MONTHS = 3;

// Income transactions older than this are deleted permanently (6 months).
// Applied lazily alongside archival when history loads.
export const DELETE_AFTER_MONTHS = 6;

// Mask shown in place of an amount when the privacy eye is hidden.
export const AMOUNT_MASK = '••••••';

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

// The instant before which transactions are deleted permanently.
export function deleteCutoff(now: Date): Date {
  const cutoff = new Date(now);
  cutoff.setMonth(cutoff.getMonth() - DELETE_AFTER_MONTHS);
  return cutoff;
}

export function isArchived(createdAt: string | Date, now: Date): boolean {
  const created = typeof createdAt === 'string' ? new Date(createdAt) : createdAt;
  return created.getTime() < archiveCutoff(now).getTime();
}

export type IncomeTransactionMonthGroup = {
  key: string; // YYYY-MM, used for stable sorting
  label: string; // e.g. "June 2026"
  transactions: IncomeTransaction[];
};

function monthKey(createdAt: string): string {
  const d = new Date(createdAt);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// Group transactions into month buckets, newest month first. Within each bucket
// the input order (newest-first from the DB) is preserved.
export function groupTransactionsByMonth(
  transactions: IncomeTransaction[],
): IncomeTransactionMonthGroup[] {
  const groups = new Map<string, IncomeTransactionMonthGroup>();
  for (const transaction of transactions) {
    const key = monthKey(transaction.created_at);
    let group = groups.get(key);
    if (!group) {
      group = {
        key,
        label: new Date(transaction.created_at).toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'long',
        }),
        transactions: [],
      };
      groups.set(key, group);
    }
    group.transactions.push(transaction);
  }
  return [...groups.values()].sort((a, b) => (a.key < b.key ? 1 : a.key > b.key ? -1 : 0));
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
