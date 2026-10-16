#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════
   Read-only health + security check for the Supabase project.
   ───────────────────────────────────────────────────────────────
   Uses ONLY the public anon key (the same access every shopper has)
   and verifies that:
     ✓ the storefront views return the seeded catalog
     ✓ check_promo works
     ✗ private tables (orders, customers, promotions, cost prices…)
       are NOT readable with the public key
   It never writes anything.

   Usage:
     SUPABASE_URL=https://xxxx.supabase.co SUPABASE_ANON_KEY=eyJ... \
       node scripts/supabase/check-connection.mjs
   ═══════════════════════════════════════════════════════════════ */

const url = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const key = process.env.SUPABASE_ANON_KEY || '';
if (!url || !key) {
  console.error('Set SUPABASE_URL and SUPABASE_ANON_KEY (the public anon key — never the service_role key).');
  process.exit(2);
}

const h = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
const get = (path) => fetch(`${url}/rest/v1/${path}`, { headers: h });
const rpc = (fn, args) => fetch(`${url}/rest/v1/rpc/${fn}`, { method: 'POST', headers: h, body: JSON.stringify(args) });

let failures = 0;
const check = async (label, fn) => {
  try {
    const detail = await fn();
    console.log(`ok    ${label}${detail ? ` — ${detail}` : ''}`);
  } catch (e) {
    failures++;
    console.log(`FAIL  ${label} — ${e.message}`);
  }
};
const json = async (res) => { const t = await res.text(); try { return JSON.parse(t); } catch { return t; } };

await check('storefront_products is readable', async () => {
  const res = await get('storefront_products?select=id,price,stock');
  if (!res.ok) throw new Error(`HTTP ${res.status} ${JSON.stringify(await json(res))}`);
  const rows = await json(res);
  if (!rows.length) throw new Error('no products — did you run supabase/seed.sql?');
  if ('cost_cents' in rows[0]) throw new Error('cost price is exposed!');
  return `${rows.length} products`;
});
await check('storefront_categories / brands / zones / settings readable', async () => {
  const counts = [];
  for (const v of ['storefront_categories', 'storefront_brands', 'storefront_delivery_zones', 'storefront_settings']) {
    const res = await get(`${v}?select=*`);
    if (!res.ok) throw new Error(`${v}: HTTP ${res.status}`);
    counts.push(`${v.replace('storefront_', '')} ${(await json(res)).length}`);
  }
  return counts.join(', ');
});
await check('check_promo works', async () => {
  const res = await rpc('check_promo', { p_code: 'WELCOME10', p_subtotal_cents: 5000 });
  const body = await json(res);
  if (!res.ok || body.valid !== true) throw new Error(JSON.stringify(body));
  return `WELCOME10 on $50.00 → −$${(body.discount_cents / 100).toFixed(2)}`;
});
for (const table of ['products', 'customers', 'orders', 'order_items', 'promotions', 'expenses', 'admin_users', 'audit_log', 'store_settings']) {
  await check(`private table "${table}" is NOT readable with the public key`, async () => {
    const res = await get(`${table}?select=*&limit=1`);
    const body = await json(res);
    if (res.ok && Array.isArray(body) && body.length) throw new Error(`exposed! got ${body.length} row(s)`);
    return res.ok ? 'empty result' : `blocked (HTTP ${res.status})`;
  });
}
await check('internal function promo_discount is not callable', async () => {
  const res = await rpc('promo_discount', { p_code: 'WELCOME10', p_subtotal_cents: 5000 });
  if (res.ok) throw new Error('callable with the public key!');
  return `blocked (HTTP ${res.status})`;
});

console.log(failures ? `\n${failures} check(s) failed.` : '\nAll checks passed.');
process.exit(failures ? 1 : 0);
