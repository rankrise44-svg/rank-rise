#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════
   Build supabase/seed.sql from the storefront's current data.
   ───────────────────────────────────────────────────────────────
   Reads (never writes) shop/js/data/*.js and shop/js/config.js and
   produces INSERT statements with the same ids, slugs, prices,
   stock and images — so the database starts as an exact copy of
   what the storefront shows today.

   Usage:   node scripts/supabase/export-seed.mjs
   Re-runs are safe: every insert uses ON CONFLICT DO NOTHING, so
   applying the seed again never overwrites changes made in the
   dashboard.
   ═══════════════════════════════════════════════════════════════ */

import { writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const load = (p) => import(pathToFileURL(join(root, p)).href);

const { PRODUCTS } = await load('shop/js/data/products.js');
const { CATEGORIES } = await load('shop/js/data/categories.js');
const { BRANDS } = await load('shop/js/data/brands.js');
const { CONFIG } = await load('shop/js/config.js');

/* ── SQL literal helpers ─────────────────────────────────────── */
const str = (v) => (v == null ? 'null' : `'${String(v).replace(/'/g, "''")}'`);
const int = (v) => (v == null ? 'null' : String(Math.trunc(v)));
const cents = (v) => (v == null ? 'null' : String(Math.round(Number(v) * 100)));
const bool = (v) => (v ? 'true' : 'false');
const arr = (a = []) => (a.length ? `array[${a.map(str).join(', ')}]::text[]` : `'{}'::text[]`);
const json = (o) => `${str(JSON.stringify(o ?? {}))}::jsonb`;
const rows = (list) => list.map((r) => `  (${r.join(', ')})`).join(',\n');

const out = [];
const section = (title) => out.push('', `-- ── ${title} ${'─'.repeat(Math.max(4, 58 - title.length))}`);

out.push(
  '-- ═══════════════════════════════════════════════════════════════',
  '-- Cedarline — seed data (GENERATED — do not edit by hand)',
  '-- Source: shop/js/data/*.js and shop/js/config.js',
  '-- Regenerate: node scripts/supabase/export-seed.mjs',
  `-- ${PRODUCTS.length} products · ${CATEGORIES.length} categories · ${BRANDS.length} brands · ` +
    `${CONFIG.delivery.zones.length} delivery zones · ${Object.keys(CONFIG.promos).length} promotions`,
  '-- Safe to re-run: existing rows are left untouched.',
  '-- ═══════════════════════════════════════════════════════════════',
  'begin;',
);

section('Store settings');
const s = CONFIG.store;
out.push(
  'insert into public.store_settings (id, name, tagline, about, email, phone, whatsapp, address, hours, currency_code, lbp_rate, free_delivery_threshold_cents, delivery_eta_text, max_qty_per_line) values',
  rows([[bool(true), str(s.name), str(s.tagline), str(s.about), str(s.email), str(s.phone), str(s.whatsapp), str(s.address),
    str(s.hours), str(CONFIG.currency.code), int(CONFIG.lbpRate), cents(CONFIG.delivery.freeThreshold),
    str(CONFIG.delivery.etaText), int(CONFIG.limits.maxQtyPerLine)]]),
  'on conflict (id) do nothing;',
);

section('Categories');
out.push(
  'insert into public.categories (id, name, blurb, icon_url, sort_order) values',
  rows(CATEGORIES.map((c, i) => [str(c.id), str(c.name), str(c.blurb), str(c.icon), int(i + 1)])),
  'on conflict (id) do nothing;',
);

section('Brands');
out.push(
  'insert into public.brands (id, name, about, logo_url, sort_order) values',
  rows(BRANDS.map((b, i) => [str(b.id), str(b.name), str(b.about), str(b.logo), int(i + 1)])),
  'on conflict (id) do nothing;',
);

section('Delivery zones');
out.push(
  'insert into public.delivery_zones (id, name, fee_cents, eta, sort_order) values',
  rows(CONFIG.delivery.zones.map((z, i) => [str(z.id), str(z.name), cents(z.fee), str(z.eta), int(i + 1)])),
  'on conflict (id) do nothing;',
);

section('Promotions');
out.push(
  'insert into public.promotions (code, label, kind, percent_off, amount_off_cents, min_subtotal_cents) values',
  rows(Object.entries(CONFIG.promos).map(([code, p]) => [
    str(code), str(p.label), str(p.type),
    p.type === 'percent' ? int(p.value) : 'null',
    p.type === 'fixed' ? cents(p.value) : 'null',
    cents(p.minSubtotal || 0),
  ])),
  'on conflict (code) do nothing;',
);

section('Products (ids, slugs and prices exactly as on the storefront)');
out.push(
  'insert into public.products (id, slug, name, category_id, brand_id, price_cents, compare_at_cents, stock, rating, review_count, badges, tags, short_description, description, features, specs, cutout_url, featured, popularity, listed_on) values',
  rows(PRODUCTS.map((p) => [
    str(p.id), str(p.slug), str(p.name), str(p.category), str(p.brand ?? null),
    cents(p.price), cents(p.compareAtPrice), int(p.stock), String(p.rating), int(p.reviewCount),
    arr(p.badges), arr(p.tags), str(p.shortDescription), str(p.description), arr(p.features),
    json(p.specs), str(p.cutout ?? null), bool(p.featured), int(p.popularity), `${str(p.createdAt)}::date`,
  ])),
  'on conflict (id) do nothing;',
);

section('Product images (current repo images; storefront-relative paths)');
const imgs = PRODUCTS.flatMap((p) => p.images.map((url, i) => [str(p.id), str(url), int(i), str(i === 0 ? p.name : `${p.name} — detail`)]));
out.push(
  'insert into public.product_images (product_id, url, position, alt) values',
  rows(imgs),
  'on conflict (product_id, position) do nothing;',
);

section('Opening stock in the inventory log');
out.push(
  "insert into public.inventory_movements (product_id, change, reason, note)",
  "select p.id, p.stock, 'restock', 'Opening stock (seed)'",
  '  from public.products p',
  ' where p.stock > 0',
  "   and not exists (select 1 from public.inventory_movements m where m.product_id = p.id);",
  '',
  'commit;',
  '',
);

writeFileSync(join(root, 'supabase', 'seed.sql'), out.join('\n'));
console.log(`Wrote supabase/seed.sql — ${PRODUCTS.length} products, ${imgs.length} images, ${CATEGORIES.length} categories, ${BRANDS.length} brands.`);
