/* ═══════════════════════════════════════════════════════════════
   Supabase connection for the storefront (PUBLIC values only)
   ───────────────────────────────────────────────────────────────
   Empty → the shop runs on the built-in data in js/data/*.js and
   saves orders in the shopper's browser (demo mode).
   Filled in → products, categories, brands, store settings,
   delivery fees, promo codes, orders and tracking all come from
   Supabase.

   `node scripts/supabase/setup.mjs --apply` fills this in
   automatically (see supabase/README.md). The values are:
     url      Project URL, e.g. https://abcdefghijkl.supabase.co
     anonKey  the public "publishable" (sb_publishable_…) or legacy
              "anon" key

   Both values are designed to be public: the database's row-level
   security (supabase/migrations/0002) decides what they can reach.
   NEVER put a secret / service_role key or the database password
   here or anywhere in the shop/ folder — anything in this folder is
   downloadable by every visitor.
   ═══════════════════════════════════════════════════════════════ */

export const SUPABASE = {
  url: 'https://rimlseeitlsbuzeayhky.supabase.co',
  anonKey: 'sb_publishable_xNqU-kD1IFxVUiCsH3n9MA_Wr8IEL60',
};

export const isSupabaseConfigured = () => Boolean(SUPABASE.url && SUPABASE.anonKey);
