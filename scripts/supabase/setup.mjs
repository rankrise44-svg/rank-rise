#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════
   One-command Supabase setup for Cedarline
   ───────────────────────────────────────────────────────────────
   Uses the Supabase Management API (HTTPS only, no database
   password, no Docker) to bring the live project up to date:

     1. finds the project (SUPABASE_PROJECT_REF, or your only project)
     2. works out which files in supabase/migrations/ are already in
        the database — from Supabase's migration history, or, if the
        SQL was run by hand earlier, by checking that every table,
        view, function, policy, trigger and bucket a file creates is
        already there
     3. applies only the missing migrations, each in one transaction,
        and records them in the same history table the Supabase CLI
        uses (so `supabase db push` keeps working later)
     4. loads supabase/seed.sql only into an EMPTY catalog
     5. turns off public sign-ups (admins are invited)
     6. writes the project URL + public key into
        shop/js/supabase.config.js (never a secret key)
     7. runs scripts/supabase/check-connection.mjs

   Nothing is dropped or overwritten. Stops before changing anything
   if the database is in a state it doesn't recognise.

   Usage
     node scripts/supabase/setup.mjs            show the plan, change nothing
     node scripts/supabase/setup.mjs --apply    carry it out

   Needs SUPABASE_ACCESS_TOKEN (supabase.com → Account → Access
   Tokens). The token is read from the environment and never printed
   or written to disk. Optional: STORE_URL=https://…/shop/ makes
   password-reset emails open the admin panel at …/shop/admin/.
   ═══════════════════════════════════════════════════════════════ */

import { readFile, writeFile, readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const MIGRATIONS_DIR = path.join(ROOT, 'supabase/migrations');
const SEED_FILE = path.join(ROOT, 'supabase/seed.sql');
const CONFIG_FILE = path.join(ROOT, 'shop/js/supabase.config.js');
const API = (process.env.SUPABASE_API_URL || 'https://api.supabase.com').replace(/\/+$/, '');
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN || '';
const APPLY = process.argv.includes('--apply');

const log = (...a) => console.log(...a);
const fail = (msg) => { console.error(`\n✗ ${msg}`); process.exit(1); };

/* ── Management API ─────────────────────────────────────────── */
async function api(p, { method = 'GET', body } = {}) {
  let res;
  try {
    res = await fetch(`${API}${p}`, {
      method,
      headers: {
        ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    fail(`Couldn't reach ${API} (${e.cause?.code || e.message}).`);
  }
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (res.status === 401 || res.status === 403) {
    fail(TOKEN
      ? 'Supabase rejected the access token (expired or revoked?). Create a new one at supabase.com → Account → Access Tokens.'
      : 'No SUPABASE_ACCESS_TOKEN is set. Create one at supabase.com → Account → Access Tokens.');
  }
  if (!res.ok) {
    const msg = typeof data === 'object' && data ? (data.message || data.error || JSON.stringify(data)) : String(data).slice(0, 300);
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return data;
}

let REF = '';
/** Run SQL as the project's postgres role. Returns the rows of the last statement. */
const sql = (query) => api(`/v1/projects/${REF}/database/query`, { method: 'POST', body: { query } });
/** Run a query whose single row has a single json column named `result`. */
const sqlValue = async (query) => (await sql(query))?.[0]?.result;
const lit = (s) => `'${String(s).replace(/'/g, "''")}'`;

/* ── Local migrations and what each one creates ─────────────── */
function objectsCreatedBy(text) {
  const body = text.replace(/--[^\n]*/g, '');
  const found = [];
  const add = (kind, name, on = '') => found.push({ kind, name: name.toLowerCase(), on: on.toLowerCase() });
  for (const m of body.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?public\.(\w+)/gi)) add('relation', m[1]);
  for (const m of body.matchAll(/create\s+(?:or\s+replace\s+)?view\s+public\.(\w+)/gi)) add('relation', m[1]);
  for (const m of body.matchAll(/create\s+(?:or\s+replace\s+)?function\s+public\.(\w+)/gi)) add('function', m[1]);
  for (const m of body.matchAll(/create\s+policy\s+"([^"]+)"\s+on\s+([\w.]+)/gi)) add('policy', m[1], m[2].includes('.') ? m[2] : `public.${m[2]}`);
  for (const m of body.matchAll(/create\s+(?:or\s+replace\s+)?trigger\s+(\w+)\s+[\s\S]*?\s+on\s+([\w.]+)/gi)) add('trigger', m[1], m[2].includes('.') ? m[2] : `public.${m[2]}`);
  for (const m of body.matchAll(/insert\s+into\s+storage\.buckets\s*\([^)]*\)\s*values\s*\(\s*'([^']+)'/gi)) add('bucket', m[1]);
  // (Objects created inside loops via format() aren't listed; the named ones are enough to tell.)
  return found;
}

function probeSql(o) {
  switch (o.kind) {
    case 'relation': return `to_regclass(${lit(`public.${o.name}`)}) is not null`;
    case 'function': return `exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = ${lit(o.name)})`;
    case 'policy':   return `exists (select 1 from pg_policies where policyname = ${lit(o.name)} and schemaname || '.' || tablename = ${lit(o.on)})`;
    case 'trigger':  return `exists (select 1 from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace where not t.tgisinternal and t.tgname = ${lit(o.name)} and n.nspname || '.' || c.relname = ${lit(o.on)})`;
    case 'bucket':   return `exists (select 1 from storage.buckets where id = ${lit(o.name)})`;
    default: throw new Error(o.kind);
  }
}
const label = (o) => `${o.kind} ${o.on ? `${o.on} → ` : ''}${o.name}`;

async function localMigrations() {
  const files = (await readdir(MIGRATIONS_DIR)).filter((f) => /^\d+_.+\.sql$/.test(f)).sort();
  const seen = new Set();
  const out = [];
  for (const file of files) {
    const text = await readFile(path.join(MIGRATIONS_DIR, file), 'utf8');
    const [, version, name] = file.match(/^(\d+)_(.+)\.sql$/);
    // Only objects no earlier file creates can prove that this file ran.
    const objects = objectsCreatedBy(text).filter((o) => { const k = label(o); if (seen.has(k)) return false; seen.add(k); return true; });
    out.push({ file, version, name, text, objects });
  }
  return out;
}

/* ── Main ───────────────────────────────────────────────────── */
log(APPLY ? 'Cedarline · Supabase setup (applying)\n' : 'Cedarline · Supabase setup (plan only — run with --apply to make changes)\n');

// 1. Project
const projects = await api('/v1/projects');
if (process.env.SUPABASE_PROJECT_REF) {
  REF = process.env.SUPABASE_PROJECT_REF.trim();
  if (!projects.some((p) => (p.ref || p.id) === REF)) fail(`Project ${REF} isn't in this account. Projects: ${projects.map((p) => `${p.name} (${p.ref || p.id})`).join(', ') || 'none'}.`);
} else if (projects.length === 1) {
  REF = projects[0].ref || projects[0].id;
} else {
  fail(projects.length
    ? `This account has ${projects.length} projects: ${projects.map((p) => `${p.name} (${p.ref || p.id})`).join(', ')}. Set SUPABASE_PROJECT_REF to choose one.`
    : 'This account has no Supabase projects yet.');
}
const project = projects.find((p) => (p.ref || p.id) === REF);
log(`Project      ${project.name} (${REF}), ${project.region || 'region ?'}, ${project.status || 'status ?'}`);
if (project.status && !/ACTIVE/.test(project.status)) fail(`The project is ${project.status}. Restore/unpause it in the Supabase dashboard, then run this again.`);

// 2. What's in the database already
const migrations = await localMigrations();
const state = await sqlValue(`select json_build_object(
  'user', current_user,
  'history', to_regclass('supabase_migrations.schema_migrations') is not null,
  'catalog', to_regclass('public.products') is not null) as result`);
let history = [];
if (state.history) {
  history = (await sqlValue(`select coalesce(json_agg(version order by version), '[]'::json) as result from supabase_migrations.schema_migrations`)) || [];
}
const probes = migrations.flatMap((m, i) => m.objects.map((o, j) => `'${i}.${j}', ${probeSql(o)}`));
const present = probes.length ? await sqlValue(`select json_build_object(${probes.join(', ')}) as result`) : {};

const localVersions = new Set(migrations.map((m) => m.version));
const unknown = history.filter((v) => !localVersions.has(v));
if (unknown.length) fail(`The database has migrations this repo doesn't know about (${unknown.join(', ')}). Someone changed the schema elsewhere; stopping so nothing is overwritten.`);

const plan = migrations.map((m, i) => {
  if (history.includes(m.version)) return { ...m, action: 'done' };
  if (!m.objects.length) return { ...m, action: 'apply' }; // only replaces earlier functions: safe to run again
  const flags = m.objects.map((_, j) => present[`${i}.${j}`]);
  if (flags.every(Boolean)) return { ...m, action: 'record' };
  if (!flags.some(Boolean)) return { ...m, action: 'apply' };
  return { ...m, action: 'conflict', missing: m.objects.filter((_, j) => !flags[j]).map(label) };
});

log(`Migrations   history table ${state.history ? `has ${history.length} entr${history.length === 1 ? 'y' : 'ies'}` : 'not created yet'}`);
const WORD = { done: 'already applied', record: 'already in the database (ran by hand) → record in history only', apply: 'apply', conflict: 'PARTLY in the database' };
for (const m of plan) log(`  ${m.version}  ${m.name.padEnd(16)} ${WORD[m.action]}`);
const conflicts = plan.filter((m) => m.action === 'conflict');
if (conflicts.length) {
  for (const c of conflicts) log(`\n  ${c.file} is only partly there. Missing:\n    - ${c.missing.join('\n    - ')}`);
  fail('Stopping without changes: a migration was only partly run by hand. Tell your developer which items are missing (above).');
}

// 3. Seed (only into an empty catalog)
let catalogCount = null;
if (state.catalog) catalogCount = Number(await sqlValue('select count(*) as result from public.products'));
const seedPlanned = catalogCount === null || catalogCount === 0;
log(`Seed         ${seedPlanned ? 'load the 24-product catalog (catalog is empty)' : `skip — catalog already has ${catalogCount} product${catalogCount === 1 ? '' : 's'}`}`);

// 4. Auth: no public sign-ups
let auth = null;
try { auth = await api(`/v1/projects/${REF}/config/auth`); } catch (e) { log(`Sign-ups     couldn't read auth settings (${e.message})`); }
const disableSignup = auth && auth.disable_signup === false;
if (auth) log(`Sign-ups     ${disableSignup ? 'turn off public sign-ups' : 'already off'}`);

// Optional: where the store is published, so password-reset links open the admin panel.
const STORE_URL = (process.env.STORE_URL || '').trim().replace(/\/*$/, '/');
let authUrls = null;
if (STORE_URL !== '/') {
  if (!/^https:\/\/[^/]+\/.*$/.test(STORE_URL)) fail('STORE_URL must be the store’s https address, e.g. https://example.com/shop/');
  const admin = `${STORE_URL}admin/`;
  const allow = String(auth?.uri_allow_list || '').split(',').map((x) => x.trim()).filter(Boolean);
  if (auth && (auth.site_url !== admin || !allow.includes(`${admin}**`))) {
    authUrls = { site_url: admin, uri_allow_list: [...new Set([...allow, `${admin}**`])].join(',') };
  }
  log(`Login links  ${authUrls ? `send password-reset links to ${admin}` : 'already point to the admin panel'}`);
}

// 5. Public connection details
const keys = await api(`/v1/projects/${REF}/api-keys`);
const publishable = keys.find((k) => k.type === 'publishable' && /^sb_publishable_[\w-]+$/.test(k.api_key || ''));
const anon = keys.find((k) => k.name === 'anon' && /^eyJ[\w-]+\.[\w-]+\.[\w-]+$/.test(k.api_key || ''));
const publicKey = (publishable || anon)?.api_key;
if (!publicKey) fail('Couldn\'t find the project\'s public (publishable / anon) key.');
const url = `https://${REF}.supabase.co`;
const configText = await readFile(CONFIG_FILE, 'utf8');
const nextConfig = configText
  .replace(/^(\s*url:\s*)'[^']*'/m, `$1'${url}'`)
  .replace(/^(\s*anonKey:\s*)'[^']*'/m, `$1'${publicKey}'`);
const configChanges = nextConfig !== configText;
log(`Storefront   ${configChanges ? 'write' : 'already has'} ${url} + the ${publishable ? 'publishable' : 'anon'} key in shop/js/supabase.config.js`);

if (!APPLY) {
  log('\nNothing changed. Run again with --apply to carry out the plan.');
  process.exit(0);
}

/* ── Apply ──────────────────────────────────────────────────── */
log('');
const asPostgres = state.user !== 'postgres' ? 'set role postgres;\n' : '';
const HISTORY_DDL = `create schema if not exists supabase_migrations;
create table if not exists supabase_migrations.schema_migrations (version text not null primary key, statements text[], name text);`;
const dollar = (text) => { let tag = 'cl'; while (text.includes(`$${tag}$`)) tag += 'x'; return `$${tag}$${text}$${tag}$`; };
const historyInsert = (m) => `insert into supabase_migrations.schema_migrations (version, name, statements)
  values (${lit(m.version)}, ${lit(m.name)}, array[${dollar(m.text)}]) on conflict (version) do nothing;`;

for (const m of plan) {
  if (m.action === 'done') continue;
  // One request = one implicit transaction: the file and its history row land together or not at all.
  const body = m.action === 'apply'
    ? `${asPostgres}${m.text}\n;\n${HISTORY_DDL}\n${historyInsert(m)}`
    : `${asPostgres}${HISTORY_DDL}\n${historyInsert(m)}`;
  try {
    await sql(body);
  } catch (e) {
    fail(`${m.file} failed and was rolled back: ${e.message}`);
  }
  log(`✓ ${m.file} ${m.action === 'apply' ? 'applied' : 'recorded as applied'}`);
}
if (plan.some((m) => m.action === 'apply')) {
  // Make the REST API pick up the new views and functions right away.
  await sql("notify pgrst, 'reload schema';");
  await new Promise((r) => setTimeout(r, 1500));
}

if (seedPlanned) {
  const count = Number(await sqlValue('select count(*) as result from public.products'));
  if (count === 0) {
    const seed = (await readFile(SEED_FILE, 'utf8')).replace(/^\s*begin\s*;\s*$/im, '').replace(/^\s*commit\s*;\s*$/im, '');
    try { await sql(`${asPostgres}${seed}`); } catch (e) { fail(`seed.sql failed and was rolled back: ${e.message}`); }
    log('✓ catalog loaded from supabase/seed.sql');
  } else {
    log(`• seed skipped — catalog has ${count} products`);
  }
}

if (disableSignup) {
  try {
    await api(`/v1/projects/${REF}/config/auth`, { method: 'PATCH', body: { disable_signup: true } });
    log('✓ public sign-ups turned off');
  } catch (e) {
    log(`! couldn't turn off sign-ups (${e.message}) — do it in Authentication → Sign In / Providers`);
  }
}

if (authUrls) {
  try {
    await api(`/v1/projects/${REF}/config/auth`, { method: 'PATCH', body: authUrls });
    log(`✓ password-reset links now open ${authUrls.site_url}`);
  } catch (e) {
    log(`! couldn't set the login links (${e.message}) — set Site URL in Authentication → URL Configuration`);
  }
}

if (configChanges) {
  await writeFile(CONFIG_FILE, nextConfig);
  log('✓ shop/js/supabase.config.js updated');
}

// 6. Verify with the public key only, exactly as a shopper would connect
log('\nChecking the live storefront API with the public key…');
// (SUPABASE_PUBLIC_URL_OVERRIDE is only for the local test bench.)
const check = spawnSync(process.execPath, [path.join(ROOT, 'scripts/supabase/check-connection.mjs')], {
  stdio: 'inherit',
  env: { ...process.env, SUPABASE_URL: process.env.SUPABASE_PUBLIC_URL_OVERRIDE || url, SUPABASE_ANON_KEY: publicKey },
});
process.exit(check.status ?? 1);
