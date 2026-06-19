#!/usr/bin/env node
/**
 * Seed a demo user with realistic data across every module, for customer demos.
 *
 * Usage (from repo root):
 *   node scripts/seed-demo-user.mjs
 *
 * Reads Supabase creds from apps/web/.env.local (or process.env). Idempotent:
 * if the demo username already exists it is deleted (cascades to all its data)
 * and recreated fresh.
 *
 * Credentials created:  username "demo"  /  password "DemoPass123"
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// ---- Config -----------------------------------------------------------------
const DEMO = {
  username: 'demo',
  password: 'DemoPass123',
  email: 'demo@expensetool.app',
  first_name: 'Maya',
  last_name: 'Santos',
  birth_date: '1994-08-15',
  accent_color: 'violet',
  theme: 'light',
};

// ---- Load env ---------------------------------------------------------------
function loadEnv() {
  let url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  let key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    try {
      const env = readFileSync(join(ROOT, 'apps/web/.env.local'), 'utf8');
      for (const raw of env.split('\n')) {
        const m = raw.match(/^([A-Z0-9_]+)=(.*)$/);
        if (!m) continue;
        const v = m[2].trim().replace(/^["']|["']$/g, '');
        if (m[1] === 'NEXT_PUBLIC_SUPABASE_URL') url ??= v;
        if (m[1] === 'NEXT_PUBLIC_SUPABASE_ANON_KEY') key ??= v;
      }
    } catch { /* ignore */ }
  }
  if (!url || !key) {
    console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY.');
    process.exit(1);
  }
  return { url, key };
}

// ---- Deterministic RNG (so re-seeds look identical) -------------------------
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(20260619);
const rand = (min, max) => min + (max - min) * rng();
const money = (min, max) => Math.round(rand(min, max) * 100) / 100;
const pick = (arr) => arr[Math.floor(rng() * arr.length)];
const pad = (n) => String(n).padStart(2, '0');
const ymd = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;

// ---- Demo data definitions --------------------------------------------------
// Last 6 calendar months including the current one.
const TODAY = new Date();
const months = [];
for (let i = 5; i >= 0; i--) {
  const dt = new Date(TODAY.getFullYear(), TODAY.getMonth() - i, 1);
  months.push({ year: dt.getFullYear(), month: dt.getMonth() + 1, current: i === 0 });
}
const maxDay = (m) => (m.current ? TODAY.getDate() : 28);

// Per-category spend profiles. perMonth = how many expenses to generate.
const PROFILES = [
  { cat: 'Rent', perMonth: 1, min: 15000, max: 15000, merchants: ['Avida Towers'], day: [1, 5] },
  { cat: 'Groceries', perMonth: 5, min: 750, max: 3600, merchants: ['SM Supermarket', 'Robinsons Supermarket', 'Landers', 'Puregold'] },
  { cat: 'Dining', perMonth: 7, min: 180, max: 1450, merchants: ['Jollibee', 'Starbucks', 'Mang Inasal', "Max's Restaurant", 'Grab Food', 'Ramen Nagi', 'Conti’s'] },
  { cat: 'Transport', perMonth: 7, min: 80, max: 640, merchants: ['Grab', 'Beep Load', 'Shell', 'Petron', 'Angkas'] },
  { cat: 'Utilities', perMonth: 2, min: 650, max: 3800, merchants: ['Meralco', 'Maynilad'] },
  { cat: 'Entertainment', perMonth: 2, min: 300, max: 1600, merchants: ['Ayala Cinemas', 'Steam', 'Spotify', 'PlayStation Store'] },
  { cat: 'Shopping', perMonth: 2, min: 500, max: 4800, merchants: ['Uniqlo', 'Lazada', 'Shopee', 'Zara', 'Ace Hardware'] },
  { cat: 'Health', perMonth: 1, min: 300, max: 2600, merchants: ['Mercury Drug', 'Healthway', 'Watsons'] },
];

// A few overseas (USD) expenses to showcase multi-currency (conversion_rate to PHP).
const OVERSEAS = [
  { cat: 'Travel', merchant: 'Agoda (Tokyo Hotel)', usd: 240, rate: 56.4 },
  { cat: 'Shopping', merchant: 'Amazon US', usd: 64, rate: 56.6 },
  { cat: 'Subscriptions', merchant: 'ChatGPT Plus', usd: 20, rate: 56.5 },
];

async function main() {
  const { url, key } = loadEnv();
  const db = createClient(url, key, { auth: { persistSession: false } });
  console.log(`→ Supabase: ${url}`);

  // 1) Clean slate: delete any existing demo user (cascades to all child rows).
  const { data: existing } = await db.from('users').select('id').eq('username', DEMO.username).maybeSingle();
  if (existing) {
    console.log(`• Existing "${DEMO.username}" user found — deleting it and all its data…`);
    const { error } = await db.from('users').delete().eq('id', existing.id);
    if (error) throw new Error(`delete existing user: ${error.message}`);
  }

  // 2) Create the user.
  const password_hash = await bcrypt.hash(DEMO.password, 12);
  const { data: user, error: userErr } = await db
    .from('users')
    .insert({
      username: DEMO.username,
      email: DEMO.email,
      password_hash,
      first_name: DEMO.first_name,
      last_name: DEMO.last_name,
      birth_date: DEMO.birth_date,
      accent_color: DEMO.accent_color,
      theme: DEMO.theme,
    })
    .select('id')
    .single();
  if (userErr) throw new Error(`create user: ${userErr.message}`);
  const userId = user.id;
  console.log(`✓ Created user ${DEMO.first_name} ${DEMO.last_name} (id ${userId})`);

  // 3) Seed default categories, then map name → id.
  const { error: catErr } = await db.rpc('seed_default_categories', { p_user_id: userId });
  if (catErr) throw new Error(`seed categories: ${catErr.message}`);
  const { data: cats } = await db.from('categories').select('id, name').eq('user_id', userId);
  const catId = Object.fromEntries(cats.map((c) => [c.name, c.id]));
  console.log(`✓ Seeded ${cats.length} categories`);

  // 4) Income sources.
  const income = [
    { user_id: userId, type: 'bank', name: 'BPI Savings', balance: 128500.0 },
    { user_id: userId, type: 'ewallet', name: 'GCash', balance: 8750.5 },
    { user_id: userId, type: 'cash', name: null, balance: 3200.0 },
  ];
  await insert(db, 'income_sources', income);
  console.log(`✓ ${income.length} income sources`);

  // 5) Budgets (overall + per-category).
  const budgets = [
    { user_id: userId, category_id: null, monthly_limit: 45000 },
    { user_id: userId, category_id: catId['Groceries'], monthly_limit: 12000 },
    { user_id: userId, category_id: catId['Dining'], monthly_limit: 7000 },
    { user_id: userId, category_id: catId['Transport'], monthly_limit: 4000 },
    { user_id: userId, category_id: catId['Entertainment'], monthly_limit: 3000 },
    { user_id: userId, category_id: catId['Shopping'], monthly_limit: 6000 },
  ];
  await insert(db, 'budgets', budgets);
  console.log(`✓ ${budgets.length} budgets`);

  // 6) Recurring expenses (next charge within ~30 days so "Upcoming Charges" fills).
  const Y = TODAY.getFullYear(), M = TODAY.getMonth() + 1;
  const nextMonth = M === 12 ? 1 : M + 1, nextY = M === 12 ? Y + 1 : Y;
  const recurring = [
    { name: 'Netflix Premium', amount: 549, cat: 'Subscriptions', cadence: 'monthly', date: clampSoon(Y, M, 25) },
    { name: 'Spotify Premium', amount: 194, cat: 'Subscriptions', cadence: 'monthly', date: clampSoon(Y, M, 22) },
    { name: 'PLDT Home Fibr', amount: 2499, cat: 'Utilities', cadence: 'monthly', date: ymd(nextY, nextMonth, 1) },
    { name: 'Anytime Fitness', amount: 1500, cat: 'Health', cadence: 'monthly', date: clampSoon(Y, M, 28) },
    { name: 'Condo Rent', amount: 15000, cat: 'Rent', cadence: 'monthly', date: ymd(nextY, nextMonth, 5) },
    { name: 'iCloud+ 200GB', amount: 149, cat: 'Subscriptions', cadence: 'monthly', date: ymd(nextY, nextMonth, 10) },
  ].map((r) => ({
    user_id: userId, name: r.name, amount: r.amount, category_id: catId[r.cat] ?? null,
    cadence: r.cadence, next_charge_date: r.date, active: true,
  }));
  await insert(db, 'recurring_expenses', recurring);
  console.log(`✓ ${recurring.length} recurring expenses`);

  // 7) Expenses across the 6 months.
  const expenses = [];
  for (const m of months) {
    const lastDay = maxDay(m);
    for (const p of PROFILES) {
      const count = m.current ? Math.ceil(p.perMonth * (TODAY.getDate() / 30)) : p.perMonth;
      for (let i = 0; i < count; i++) {
        const day = p.day
          ? Math.min(Math.round(rand(p.day[0], p.day[1])), lastDay)
          : 1 + Math.floor(rng() * lastDay);
        const src = rng() < 0.12 ? 'receipt' : 'manual';
        expenses.push({
          user_id: userId,
          amount: p.cat === 'Rent' ? 15000 : money(p.min, p.max),
          currency: 'PHP',
          conversion_rate: null,
          category_id: catId[p.cat] ?? null,
          merchant: pick(p.merchants),
          description: null,
          occurred_at: ymd(m.year, m.month, Math.max(1, day)),
          source: src,
        });
      }
    }
  }
  // A couple of overseas (USD) expenses in recent months.
  OVERSEAS.forEach((o, idx) => {
    const m = months[months.length - 1 - idx];
    expenses.push({
      user_id: userId, amount: o.usd, currency: 'USD', conversion_rate: o.rate,
      category_id: catId[o.cat] ?? null, merchant: o.merchant, description: 'Paid in USD',
      occurred_at: ymd(m.year, m.month, 8 + idx * 3), source: 'manual',
    });
  });
  await insert(db, 'expenses', expenses);
  console.log(`✓ ${expenses.length} expenses across ${months.length} months`);

  // 8) Reminders.
  const reminders = [
    { user_id: userId, title: 'Pay credit card bill', remind_date: clampSoon(Y, M, 23), cadence: 'monthly', active: true },
    { user_id: userId, title: 'Review monthly budget', remind_date: clampSoon(Y, M, 30), cadence: 'monthly', active: true },
    { user_id: userId, title: 'Renew car insurance', remind_date: ymd(nextY, nextMonth, 15), cadence: 'yearly', active: true },
  ];
  await insert(db, 'reminders', reminders);
  console.log(`✓ ${reminders.length} reminders`);

  console.log('\n──────────────────────────────────────────────');
  console.log('✅ Demo user ready. Log in with:');
  console.log(`   Username: ${DEMO.username}`);
  console.log(`   Password: ${DEMO.password}`);
  console.log(`   (Name: ${DEMO.first_name} ${DEMO.last_name} · Email: ${DEMO.email})`);
  console.log('──────────────────────────────────────────────');
}

// Pick day `d` in this month, but if it's already past, roll to next month so the
// reminder/recurring date is in the future (nicer for a live demo).
function clampSoon(y, m, d) {
  const candidate = new Date(y, m - 1, d);
  if (candidate >= new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate())) return ymd(y, m, d);
  const nm = m === 12 ? 1 : m + 1, ny = m === 12 ? y + 1 : y;
  return ymd(ny, nm, d);
}

async function insert(db, table, rows) {
  const { error } = await db.from(table).insert(rows);
  if (error) throw new Error(`insert ${table}: ${error.message}`);
}

main().catch((e) => { console.error('❌', e.message); process.exit(1); });
