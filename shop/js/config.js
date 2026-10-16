/* ═══════════════════════════════════════════════════════════════
   CEDARLINE — STORE CONFIGURATION
   ───────────────────────────────────────────────────────────────
   Everything that changes between "demo" and "live" lives here:
   store identity, WhatsApp number, currency, delivery zones, promo
   codes, ordering methods and the API endpoint. UI code reads from this file and
   never hard-codes these values.
   ═══════════════════════════════════════════════════════════════ */

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
