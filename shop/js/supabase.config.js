/* ═══════════════════════════════════════════════════════════════
   Supabase connection for the storefront (PUBLIC values only)
   ───────────────────────────────────────────────────────────────
   Not loaded by any page yet — the storefront still runs on
   js/data/*.js. It will be switched over in a later, separately
   approved step.

   Paste here, from Supabase → Project Settings → API:
     url      Project URL, e.g. https://abcdefghijkl.supabase.co
     anonKey  the "anon" / "public" key

   Both values are designed to be public: the database's row-level
   security (supabase/migrations/0002) decides what they can reach.
   NEVER put the service_role key or the database password here or
   anywhere in the shop/ folder — anything in this folder is
   downloadable by every visitor.
   ═══════════════════════════════════════════════════════════════ */

export const SUPABASE = {
  url: '',
  anonKey: '',
};

export const isSupabaseConfigured = () => Boolean(SUPABASE.url && SUPABASE.anonKey);
