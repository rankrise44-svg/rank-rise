/* ═══════════════════════════════════════════════════════════════
   CATALOG SERVICE
   ───────────────────────────────────────────────────────────────
   The only module that knows where products come from. Pages call
   these async functions and never import the data file directly,
   so moving to a database means changing this file only:

     CONFIG.api.baseUrl = null   → local data in js/data/
     CONFIG.api.baseUrl = '…'    → GET {base}/products, /categories

   The filter/sort/search helpers are pure and are reused on the
   client either way (or mirrored by the API as query params).
   ═══════════════════════════════════════════════════════════════ */

import { CONFIG } from '../config.js';
import { PRODUCTS } from '../data/products.js';
import { CATEGORIES } from '../data/categories.js';
import { BRANDS } from '../data/brands.js';

let cache = null;

async function load() {
  if (cache) return cache;
  if (CONFIG.api.baseUrl) {
    const [p, c, b] = await Promise.all([
      fetch(`${CONFIG.api.baseUrl}/products`).then(okJson),
      fetch(`${CONFIG.api.baseUrl}/categories`).then(okJson),
      fetch(`${CONFIG.api.baseUrl}/brands`).then(okJson),
    ]);
    cache = { products: p, categories: c, brands: b };
  } else {
    cache = { products: PRODUCTS, categories: CATEGORIES, brands: BRANDS };
  }
  return cache;
}

function okJson(res) {
  if (!res.ok) throw new Error(`Catalog request failed (${res.status})`);
  return res.json();
}

/* ── Reads ─────────────────────────────────────────────────────── */

export async function getProducts() {
  return (await load()).products;
}

export async function getCategories() {
  return (await load()).categories;
}

export async function getCategory(id) {
  return (await getCategories()).find((c) => c.id === id) || null;
}

export async function getBrands() {
  return (await load()).brands;
}

export async function getBrand(id) {
  return (await getBrands()).find((b) => b.id === id) || null;
}

/** Look up by slug (URL id) or internal id. */
export async function getProduct(idOrSlug) {
  if (!idOrSlug) return null;
  return (await getProducts()).find((p) => p.slug === idOrSlug || p.id === idOrSlug) || null;
}

/** Map of id → product, for resolving cart and wishlist lines. */
export async function getProductMap() {
  return new Map((await getProducts()).map((p) => [p.id, p]));
}

export async function getFeatured(limit = 8) {
  const all = await getProducts();
  return sortProducts(all.filter((p) => p.featured), 'featured').slice(0, limit);
}

export async function getNewArrivals(limit = 4) {
  return sortProducts(await getProducts(), 'newest').slice(0, limit);
}

/** Biggest discounts first; in-stock only. */
export async function getDeals(limit = 12) {
  const all = (await getProducts()).filter((p) => isOnSale(p) && isInStock(p));
  return all.sort((a, b) => discountPercent(b) - discountPercent(a) || b.popularity - a.popularity).slice(0, limit);
}

/* Merchandising collections used by the main navigation. */
export const COLLECTIONS = {
  bestsellers: { name: 'Best Sellers', blurb: 'The pieces our customers reorder most.', test: (p) => p.badges.includes('bestseller'), sort: 'featured' },
  new:         { name: 'New Arrivals', blurb: 'The latest additions to the store.', test: () => true, sort: 'newest', limit: 8 },
  deals:       { name: 'Deals', blurb: 'Limited-time prices on kitchen favourites.', test: (p) => isOnSale(p), sort: 'discount' },
};

export async function getRelated(product, limit = 4) {
  const all = await getProducts();
  const same = all.filter((p) => p.id !== product.id && p.category === product.category);
  const others = sortProducts(all.filter((p) => p.id !== product.id && p.category !== product.category), 'featured');
  // In-stock pieces first: a sold-out recommendation is a dead end.
  const ranked = [...sortProducts(same, 'featured'), ...others];
  return [...ranked.filter(isInStock), ...ranked.filter((p) => !isInStock(p))].slice(0, limit);
}

/* ── Pure helpers ──────────────────────────────────────────────── */

export const isOnSale = (p) => p.compareAtPrice != null && p.compareAtPrice > p.price;
export const isInStock = (p) => p.stock > 0;
export const discountPercent = (p) => (isOnSale(p) ? Math.round((1 - p.price / p.compareAtPrice) * 100) : 0);

export const SORTS = [
  { id: 'featured',   label: 'Featured' },
  { id: 'newest',     label: 'Newest' },
  { id: 'price-asc',  label: 'Price: low to high' },
  { id: 'price-desc', label: 'Price: high to low' },
  { id: 'rating',     label: 'Top rated' },
  { id: 'name',       label: 'Name: A–Z' },
  { id: 'discount',   label: 'Biggest discount' },
];

export function sortProducts(list, sort = 'featured') {
  const arr = [...list];
  const by = {
    featured:     (a, b) => b.popularity - a.popularity,
    newest:       (a, b) => b.createdAt.localeCompare(a.createdAt),
    'price-asc':  (a, b) => a.price - b.price || b.popularity - a.popularity,
    'price-desc': (a, b) => b.price - a.price || b.popularity - a.popularity,
    rating:       (a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount,
    name:         (a, b) => a.name.localeCompare(b.name),
    discount:     (a, b) => discountPercent(b) - discountPercent(a) || b.popularity - a.popularity,
  }[sort] || ((a, b) => b.popularity - a.popularity);
  return arr.sort(by);
}

/**
 * Filter a product list.
 *   { categories: ['cookware'], brands: ['ferrano'], minPrice, maxPrice, inStock, onSale }
 */
export function filterProducts(list, f = {}) {
  return list.filter((p) => {
    if (f.categories?.length && !f.categories.includes(p.category)) return false;
    if (f.brands?.length && !f.brands.includes(p.brand)) return false;
    if (f.minPrice != null && p.price < f.minPrice) return false;
    if (f.maxPrice != null && p.price > f.maxPrice) return false;
    if (f.inStock && !isInStock(p)) return false;
    if (f.onSale && !isOnSale(p)) return false;
    return true;
  });
}

const normalize = (s) =>
  String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’']/g, '');

/**
 * Keyword search with simple relevance ranking. Every word in the
 * query must match somewhere; name matches outrank tag/description
 * matches. Returns products sorted by relevance.
 */
export function searchProducts(list, query, categories = [], brands = []) {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const catName = Object.fromEntries(categories.map((c) => [c.id, normalize(c.name)]));
  const brandName = Object.fromEntries(brands.map((b) => [b.id, normalize(b.name)]));

  const scored = [];
  for (const p of list) {
    const name = normalize(p.name);
    const tags = normalize(`${p.tags.join(' ')} ${brandName[p.brand] || ''}`);
    const cat = `${catName[p.category] || ''} ${p.category}`;
    const body = normalize(`${p.shortDescription} ${p.description}`);
    let score = 0;
    let all = true;
    for (const w of words) {
      const stem = w.length > 3 ? w.replace(/(es|s)$/, '') : w;
      if (name.includes(stem)) score += name.startsWith(stem) ? 12 : 8;
      else if (tags.includes(stem) || cat.includes(stem)) score += 5;
      else if (body.includes(stem)) score += 2;
      else { all = false; break; }
    }
    if (all) scored.push({ p, score: score + p.popularity / 100 });
  }
  return scored.sort((a, b) => b.score - a.score).map((s) => s.p);
}

/** Search, optionally limited to one category (the header's category picker). */
export async function search(query, categoryId = '') {
  const { products, categories, brands } = await load();
  const pool = categoryId ? products.filter((p) => p.category === categoryId) : products;
  return searchProducts(pool, query, categories, brands);
}
