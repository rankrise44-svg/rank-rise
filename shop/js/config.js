/* ═══════════════════════════════════════════════════════════════
   CEDARLINE — STORE CONFIGURATION
   ───────────────────────────────────────────────────────────────
   Everything that changes between "demo" and "live" lives here:
   store identity, WhatsApp number, currency, delivery zones, promo
   codes, ordering methods and the API endpoint. UI code reads from this file and
   never hard-codes these values.

   When supabase.config.js is filled in, the store details, currency,
   LBP rate, delivery fees and limits below are replaced at page load
   by the values the owner manages in the database (see the bottom of
   this file). The values here then act only as a fallback.
   ═══════════════════════════════════════════════════════════════ */

import { isSupabaseConfigured } from './supabase.config.js';
import { fetchCatalog, fetchSettings, fetchDeliveryZones } from './lib/supabase-rest.js';

export const CONFIG = {
  store: {
    name: 'Cedarline',
    tagline: 'Cook better. Live better.',
    about: 'Kitchen essentials for Lebanese homes — delivered across all eight governorates.',
    email: 'hello@cedarline.example',
    // ★ The store's WhatsApp Business number. Orders sent "via WhatsApp"
    // and every WhatsApp button open a chat with this number.
    phone: '+961 70 991 555',
    whatsapp: '+961 70 991 555',
    address: 'Hamra Street, Beirut, Lebanon',
    hours: 'Mon–Sat, 9:00–18:00',
  },

  // Prices in the catalog are in this currency. Lebanese retail is
  // priced in USD today; cash on delivery can also be paid in LBP.
  currency: { code: 'USD', locale: 'en-US' },
  // Shown to cash-on-delivery customers who choose to pay in LBP.
  // Set from the day's rate (or fetch it from the backend).
  lbpRate: 89500,

  // null → the store runs on the local catalog in js/data/ and saves
  // orders to this browser. Set to e.g. 'https://api.cedarline.example/v1'
  // and the services in js/services/ will call the API instead.
  api: { baseUrl: null },

  // Delivery is priced per governorate. Fees are in the store currency.
  delivery: {
    freeThreshold: 75,
    etaText: '1–3 working days',
    zones: [
      { id: 'beirut',         name: 'Beirut',         fee: 3, eta: '1–2 working days' },
      { id: 'mount-lebanon',  name: 'Mount Lebanon',  fee: 4, eta: '1–2 working days' },
      { id: 'north',          name: 'North',          fee: 5, eta: '2–3 working days' },
      { id: 'akkar',          name: 'Akkar',          fee: 6, eta: '2–4 working days' },
      { id: 'bekaa',          name: 'Bekaa',          fee: 5, eta: '2–3 working days' },
      { id: 'baalbek-hermel', name: 'Baalbek-Hermel', fee: 6, eta: '2–4 working days' },
      { id: 'south',          name: 'South',          fee: 5, eta: '2–3 working days' },
      { id: 'nabatieh',       name: 'Nabatieh',       fee: 5, eta: '2–3 working days' },
    ],
  },

  // Demo promo codes. In production these are validated server-side.
  promos: {
    WELCOME10: { type: 'percent', value: 10, label: '10% off your order' },
    BEIRUT5:   { type: 'fixed',   value: 5,  label: '$5 off orders over $40', minSubtotal: 40 },
  },

  /* How customers can order — shown at checkout, in this order.
       cod       → place the order here, pay the courier on delivery.
       whatsapp  → the order is sent to the store's WhatsApp as a message;
                   the team confirms details and delivery in the chat.     */
  payments: {
    methods: [
      { id: 'cod',      name: 'Cash on delivery',  description: 'Place your order now and pay the courier in USD or LBP when it arrives.' },
      { id: 'whatsapp', name: 'Order via WhatsApp', description: 'Send your order to us on WhatsApp — we confirm the details and delivery with you in the chat.' },
    ],
  },

  limits: { maxQtyPerLine: 10 },

  storageKeys: {
    cart: 'cedarline:cart',
    wishlist: 'cedarline:wishlist',
    promo: 'cedarline:promo',
    orders: 'cedarline:orders',
    account: 'cedarline:account',
  },
};

/* ── Live store settings (Supabase) ────────────────────────────────
   Every module imports CONFIG, so awaiting here guarantees prices,
   fees and the WhatsApp number are the database's before anything
   renders. If the database can't be reached in time, the defaults
   above are used and orders are still re-checked by the server.   */
export const LIVE = isSupabaseConfigured();

if (LIVE) {
  fetchCatalog().catch(() => {}); // start the catalog download in parallel
  try {
    const [s, zones] = await Promise.all([fetchSettings({ timeout: 6000 }), fetchDeliveryZones({ timeout: 6000 })]);
    if (s) {
      for (const k of ['name', 'tagline', 'about', 'email', 'phone', 'whatsapp', 'address', 'hours']) {
        if (s[k]) CONFIG.store[k] = s[k];
      }
      if (s.currencyCode) CONFIG.currency.code = s.currencyCode;
      if (s.lbpRate > 0) CONFIG.lbpRate = Number(s.lbpRate);
      if (s.freeThreshold != null) CONFIG.delivery.freeThreshold = Number(s.freeThreshold);
      if (s.etaText) CONFIG.delivery.etaText = s.etaText;
      if (s.maxQtyPerLine > 0) CONFIG.limits.maxQtyPerLine = s.maxQtyPerLine;
    }
    if (zones?.length) CONFIG.delivery.zones = zones.map(({ id, name, fee, eta }) => ({ id, name, fee: Number(fee), eta }));
  } catch (err) {
    console.warn('[Cedarline] Using built-in store settings:', err.message);
  }
  // Promo codes are checked by the database (cart.js loads each code's rule on demand).
  CONFIG.promos = {};
}
