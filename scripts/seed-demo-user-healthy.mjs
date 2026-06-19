#!/usr/bin/env node
/**
 * Seed a SECOND demo user whose finances look healthy — every category well
 * under budget, positive cash flow, no alerts. For customer demos.
 *
 * Usage (from repo root):
 *   node scripts/seed-demo-user-healthy.mjs
 *
 * Idempotent: deletes + recreates the demo2 user. Credentials below.
 *   username "demo2"  /  password "DemoPass123"
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const DEMO = {
  username: 'demo2',
  password: 'DemoPass123',
  email: 'demo2@expensetool.app',
  first_name: 'Liam',
  last_name: 'Reyes',
  birth_date: '1991-03-22',
  accent_color: 'green',
  theme: 'light',
};

function loadEnv() {
  let url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  let key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    try {
      for (const raw of readFileSync(join(ROOT, 'apps/web/.env.local'), 'utf8').split('\n')) {
        const m = raw.match(/^([A-Z0-9_]+)=(.*)$/);
        if (!m) continue;
        const v = m[2].trim().replace(/^["']|["']$/g, '');
        if (m[1] === 'NEXT_PUBLIC_SUPABASE_URL') url ??= v;
        if (m[1] === 'NEXT_PUBLIC_SUPABASE_ANON_KEY') key ??= v;
      }
    } catch { /* ignore */ }
  }
  if (!url || !key) { console.error('❌ Missing Supabase env vars.'); process.exit(1); }
  return { url, key };
}

// Deterministic RNG so re-seeds look identical.
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(70260619);
const rand = (a, b) => a + (b - a) * rng();
const pick = (a) => a[Math.floor(rng() * a.length)];
const pad = (n) => String(n).padStart(2, '0');
const ymd = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;
const r2 = (n) => Math.round(n * 100) / 100;

const TODAY = new Date();
const months = [];
for (let i = 5; i >= 0; i--) {
  const dt = new Date(TODAY.getFullYear(), TODAY.getMonth() - i, 1);
  months.push({ year: dt.getFullYear(), month: dt.getMonth() + 1, current: i === 0 });
}
const maxDay = (m) => (m.current ? TODAY.getDate() : 28);

// Each category's target MONTHLY spend is kept well under its budget (~50-65%),
// so the dashboard budget status is always green. Rent has no per-category budget.
const PROFILES = [
  { cat: 'Rent', budget: null, target: 16000, count: 1, merchants: ['DMCI Homes'], day: [2, 4] },
  { cat: 'Groceries', budget: 14000, target: 7800, count: 6, merchants: ['SM Supermarket', 'Landers', 'Robinsons Supermarket', 'Puregold'] },
  { cat: 'Dining', budget: 9000, target: 4200, count: 6, merchants: ['Jollibee', 'Starbucks', "Max's Restaurant", 'Ramen Nagi', 'Grab Food'] },
  { cat: 'Transport', budget: 6000, target: 2600, count: 6, merchants: ['Grab', 'Beep Load', 'Shell', 'Angkas'] },
  { cat: 'Utilities', budget: 7000, target: 4600, count: 2, merchants: ['Meralco', 'Maynilad'] },
  { cat: 'Entertainment', budget: 5000, target: 1700, count: 2, merchants: ['Ayala Cinemas', 'Spotify', 'Steam'] },
  { cat: 'Shopping', budget: 9000, target: 3200, count: 2, merchants: ['Uniqlo', 'Lazada', 'Decathlon'] },
  { cat: 'Health', budget: null, target: 1200, count: 1, merchants: ['Mercury Drug', 'Healthway'] },
  { cat: 'Savings', budget: null, target: 10000, count: 1, merchants: ['Auto-transfer to BDO'], day: [5, 6] },
];

// Split a target total into `count` jittered amounts (sum ≈ target, stays under budget).
function split(target, count) {
  const base = target / count;
  const out = [];
  for (let i = 0; i < count; i++) out.push(Math.max(50, r2(base * rand(0.7, 1.3))));
  return out;
}

async function insert(db, table, rows) {
  const { error } = await db.from(table).insert(rows);
  if (error) throw new Error(`insert ${table}: ${error.message}`);
}

async function main() {
  const { url, key } = loadEnv();
  const db = createClient(url, key, { auth: { persistSession: false } });
  console.log(`→ Supabase: ${url}`);

  const { data: existing } = await db.from('users').select('id').eq('username', DEMO.username).maybeSingle();
  if (existing) {
    console.log(`• Existing "${DEMO.username}" found — deleting it and its data…`);
    const { error } = await db.from('users').delete().eq('id', existing.id);
    if (error) throw new Error(`delete existing: ${error.message}`);
  }

  const password_hash = await bcrypt.hash(DEMO.password, 12);
  const { data: user, error: userErr } = await db.from('users').insert({
    username: DEMO.username, email: DEMO.email, password_hash,
    first_name: DEMO.first_name, last_name: DEMO.last_name, birth_date: DEMO.birth_date,
    accent_color: DEMO.accent_color, theme: DEMO.theme,
  }).select('id').single();
  if (userErr) throw new Error(`create user: ${userErr.message}`);
  const userId = user.id;
  console.log(`✓ Created ${DEMO.first_name} ${DEMO.last_name} (id ${userId})`);

  const { error: catErr } = await db.rpc('seed_default_categories', { p_user_id: userId });
  if (catErr) throw new Error(`seed categories: ${catErr.message}`);
  const { data: cats } = await db.from('categories').select('id, name').eq('user_id', userId);
  const catId = Object.fromEntries(cats.map((c) => [c.name, c.id]));
  console.log(`✓ Seeded ${cats.length} categories`);

  // Healthy balances — high savings, positive net worth.
  await insert(db, 'income_sources', [
    { user_id: userId, type: 'bank', name: 'BDO Savings', balance: 342000.0 },
    { user_id: userId, type: 'ewallet', name: 'Maya', balance: 24500.0 },
    { user_id: userId, type: 'cash', name: null, balance: 7500.0 },
  ]);
  console.log('✓ 3 income sources');

  // Generous budgets (all comfortably above actual spend).
  const budgets = [{ user_id: userId, category_id: null, monthly_limit: 80000 }];
  for (const p of PROFILES) {
    if (p.budget) budgets.push({ user_id: userId, category_id: catId[p.cat], monthly_limit: p.budget });
  }
  await insert(db, 'budgets', budgets);
  console.log(`✓ ${budgets.length} budgets (all under-spent)`);

  // Modest recurring charges, upcoming dates.
  const Y = TODAY.getFullYear(), M = TODAY.getMonth() + 1;
  const nm = M === 12 ? 1 : M + 1, ny = M === 12 ? Y + 1 : Y;
  const soon = (d) => {
    const cand = new Date(Y, M - 1, d);
    return cand >= new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate()) ? ymd(Y, M, d) : ymd(ny, nm, d);
  };
  await insert(db, 'recurring_expenses', [
    { name: 'Netflix Standard', amount: 399, cat: 'Subscriptions', cadence: 'monthly', date: soon(24) },
    { name: 'Spotify Premium', amount: 194, cat: 'Subscriptions', cadence: 'monthly', date: soon(21) },
    { name: 'Globe At Home Fiber', amount: 1999, cat: 'Utilities', cadence: 'monthly', date: ymd(ny, nm, 2) },
    { name: 'Condo Rent', amount: 16000, cat: 'Rent', cadence: 'monthly', date: ymd(ny, nm, 3) },
    { name: 'Gym Membership', amount: 1200, cat: 'Health', cadence: 'monthly', date: soon(27) },
  ].map((r) => ({
    user_id: userId, name: r.name, amount: r.amount, category_id: catId[r.cat] ?? null,
    cadence: r.cadence, next_charge_date: r.date, active: true,
  })));
  console.log('✓ 5 recurring expenses');

  // Expenses — healthy, steady, under budget every month.
  const expenses = [];
  for (const m of months) {
    const lastDay = maxDay(m);
    const scale = m.current ? Math.max(0.45, TODAY.getDate() / 30) : 1; // partial current month spends less
    for (const p of PROFILES) {
      const count = Math.max(1, Math.round(p.count * scale));
      const amounts = p.cat === 'Rent'
        ? [16000]
        : split(p.target * scale, count);
      for (const amt of amounts) {
        const day = p.day
          ? Math.min(Math.round(rand(p.day[0], p.day[1])), lastDay)
          : 1 + Math.floor(rng() * lastDay);
        expenses.push({
          user_id: userId, amount: amt, currency: 'PHP', conversion_rate: null,
          category_id: catId[p.cat] ?? null, merchant: pick(p.merchants), description: null,
          occurred_at: ymd(m.year, m.month, Math.max(1, day)),
          source: rng() < 0.1 ? 'receipt' : 'manual',
        });
      }
    }
  }
  await insert(db, 'expenses', expenses);
  console.log(`✓ ${expenses.length} expenses across ${months.length} months (all categories under budget)`);

  await insert(db, 'reminders', [
    { user_id: userId, title: 'Move surplus to savings', remind_date: soon(28), cadence: 'monthly', active: true },
    { user_id: userId, title: 'Review investment portfolio', remind_date: ymd(ny, nm, 12), cadence: 'monthly', active: true },
  ]);
  console.log('✓ 2 reminders');

  console.log('\n──────────────────────────────────────────────');
  console.log('✅ Healthy demo user ready. Log in with:');
  console.log(`   Username: ${DEMO.username}`);
  console.log(`   Password: ${DEMO.password}`);
  console.log(`   (Name: ${DEMO.first_name} ${DEMO.last_name} · green theme · all budgets under)`);
  console.log('──────────────────────────────────────────────');
}

main().catch((e) => { console.error('❌', e.message); process.exit(1); });
