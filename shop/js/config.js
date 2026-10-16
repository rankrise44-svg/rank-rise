/* ═══════════════════════════════════════════════════════════════
   CEDARLINE — STORE CONFIGURATION
   ───────────────────────────────────────────────────────────────
   Everything that changes between "demo" and "live" lives here:
   store identity, currency, delivery zones, promo codes, payment
   methods and the API endpoint. UI code reads from this file and
   never hard-codes these values.
   ═══════════════════════════════════════════════════════════════ */

export const CONFIG = {
  store: {
    name: 'Cedarline',
    tagline: 'Cook better. Live better.',
    about: 'Kitchen essentials for Lebanese homes — delivered across all eight governorates.',
    email: 'hello@cedarline.example',
    phone: '+961 70 000 000',
    whatsapp: '+961 70 000 000',
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

  /* Payment methods shown at checkout, in order.
     mode: 'demo' → every method runs a realistic simulated flow and
     no money moves. Set mode: 'live' once each provider in
     js/services/payments.js is connected to a real backend; methods
     with enabled: false are then shown as "coming soon".            */
  payments: {
    mode: 'demo',
    methods: [
      { id: 'cod',    kind: 'cod',    name: 'Cash on delivery', description: 'Pay the courier in USD or LBP when your order arrives.', enabled: true },
      { id: 'card',   kind: 'card',   name: 'Credit / debit card', description: 'Visa or Mastercard, with 3-D Secure verification.', enabled: true },
      { id: 'whish',  kind: 'wallet', name: 'Whish Money', description: 'Approve a payment request in your Whish app.', enabled: true },
      { id: 'omt',    kind: 'wallet', name: 'OMT Pay', description: 'Approve a payment request in your OMT app.', enabled: true },
    ],
    // Demo test cards (only used when mode is 'demo').
    testCards: {
      success: '4242 4242 4242 4242',
      declined: '4000 0000 0000 0002',
      insufficient: '4000 0000 0000 9995',
    },
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
