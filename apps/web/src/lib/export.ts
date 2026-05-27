import type { CategoryTotal, PeriodSummary } from '@expense/shared';
import type { Expense, Category } from '@expense/shared';

type ExpenseRow = {
  Date: string;
  Category: string;
  Merchant: string;
  Description: string;
  Currency: string;
  Amount: number;
  'Rate to PHP': number | string;
  'PHP Amount': number;
};

type SummaryRow = {
  Metric: string;
  Value: string | number;
};

type CategoryRow = {
  Category: string;
  Count: number;
  Total: number;
  '%': string;
};

export function buildSummaryRows(summary: PeriodSummary): SummaryRow[] {
  const avg = summary.count > 0 ? summary.total / summary.count : 0;
  return [
    { Metric: 'Period', Value: summary.period },
    { Metric: 'From', Value: summary.from },
    { Metric: 'To', Value: summary.to },
    { Metric: 'Total (PHP)', Value: summary.total },
    { Metric: 'Expense Count', Value: summary.count },
    { Metric: 'Average (PHP)', Value: avg },
  ];
}

export function buildCategoryRows(cats: CategoryTotal[], total: number): CategoryRow[] {
  return cats.map((c) => ({
    Category: c.category_name,
    Count: c.count,
    Total: c.total,
    '%': total > 0 ? `${Math.round((c.total / total) * 100)}%` : '—',
  }));
}

export function buildExpenseRows(expenses: Expense[], categories: Category[]): ExpenseRow[] {
  const catMap = new Map(categories.map((c) => [c.id, c.name]));
  return expenses
    .sort((a, b) => b.occurred_at.localeCompare(a.occurred_at))
    .map((e) => ({
      Date: e.occurred_at,
      Category: e.category_id ? (catMap.get(e.category_id) ?? 'Unknown') : 'Uncategorized',
      Merchant: e.merchant ?? '',
      Description: e.description ?? '',
      Currency: e.currency,
      Amount: e.amount,
      'Rate to PHP': e.conversion_rate ?? '—',
      'PHP Amount': e.conversion_rate ? e.amount * e.conversion_rate : e.amount,
    }));
}

// ── CSV ────────────────────────────────────────────────────────────────────
export function rowsToCSV(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]!);
  const escape = (v: unknown) => {
    const s = String(v ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  return [headers.join(','), ...rows.map((r) => headers.map((h) => escape(r[h])).join(','))].join('\n');
}

function downloadText(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportCSV(
  summary: PeriodSummary,
  expenses: Expense[],
  categories: Category[],
) {
  const expenseRows = buildExpenseRows(expenses, categories);
  const catRows = buildCategoryRows(summary.by_category, summary.total);

  const parts = [
    `"EXPENSE REPORT — ${summary.from} to ${summary.to}"`,
    '',
    '"SUMMARY"',
    rowsToCSV(buildSummaryRows(summary)),
    '',
    '"BY CATEGORY"',
    rowsToCSV(catRows),
    '',
    '"EXPENSE LIST"',
    rowsToCSV(expenseRows),
  ];

  downloadText(
    `expense-report-${summary.from}-${summary.to}.csv`,
    parts.join('\n'),
    'text/csv',
  );
}

// ── Excel ──────────────────────────────────────────────────────────────────
export async function exportExcel(
  summary: PeriodSummary,
  expenses: Expense[],
  categories: Category[],
) {
  const XLSX = await import('xlsx');

  const wb = XLSX.utils.book_new();

  const summaryWs = XLSX.utils.json_to_sheet(buildSummaryRows(summary));
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');

  const catWs = XLSX.utils.json_to_sheet(buildCategoryRows(summary.by_category, summary.total));
  XLSX.utils.book_append_sheet(wb, catWs, 'By Category');

  const expWs = XLSX.utils.json_to_sheet(buildExpenseRows(expenses, categories));
  XLSX.utils.book_append_sheet(wb, expWs, 'Expense List');

  XLSX.writeFile(wb, `expense-report-${summary.from}-${summary.to}.xlsx`);
}

// ── PDF ────────────────────────────────────────────────────────────────────
export async function exportPDF(
  summary: PeriodSummary,
  expenses: Expense[],
  categories: Category[],
) {
  const { jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF();
  const title = `Expense Report: ${summary.from} → ${summary.to}`;

  doc.setFontSize(16);
  doc.text(title, 14, 18);
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text(`Generated ${new Date().toLocaleDateString()}`, 14, 25);
  doc.setTextColor(0);

  // Summary table
  doc.setFontSize(12);
  doc.text('Summary', 14, 36);
  autoTable(doc, {
    startY: 40,
    head: [['Metric', 'Value']],
    body: buildSummaryRows(summary).map((r) => [r.Metric, String(r.Value)]),
    theme: 'striped',
    headStyles: { fillColor: [91, 141, 239] },
    margin: { left: 14, right: 14 },
  });

  // By category
  const afterSummary = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  doc.setFontSize(12);
  doc.text('By Category', 14, afterSummary);
  autoTable(doc, {
    startY: afterSummary + 4,
    head: [['Category', 'Count', 'Total (PHP)', '%']],
    body: buildCategoryRows(summary.by_category, summary.total).map((r) => [
      r.Category,
      r.Count,
      r.Total.toFixed(2),
      r['%'],
    ]),
    theme: 'striped',
    headStyles: { fillColor: [91, 141, 239] },
    margin: { left: 14, right: 14 },
  });

  // Expense list
  doc.addPage();
  doc.setFontSize(12);
  doc.text('Expense List', 14, 18);
  const expRows = buildExpenseRows(expenses, categories);
  autoTable(doc, {
    startY: 22,
    head: [['Date', 'Category', 'Merchant', 'Description', 'Currency', 'Amount', 'PHP Amount']],
    body: expRows.map((r) => [
      r.Date,
      r.Category,
      r.Merchant,
      r.Description,
      r.Currency,
      r.Amount.toFixed(2),
      r['PHP Amount'].toFixed(2),
    ]),
    theme: 'striped',
    headStyles: { fillColor: [91, 141, 239] },
    margin: { left: 14, right: 14 },
    styles: { fontSize: 8 },
  });

  doc.save(`expense-report-${summary.from}-${summary.to}.pdf`);
}
