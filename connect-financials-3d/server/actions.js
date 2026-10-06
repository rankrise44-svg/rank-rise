// Turns the action Valgon's AI picks into the steps the page runs. Shared by
// the site server (Groq) and the page itself (the claude.ai preview).
import { ACCOUNTS } from './knowledge.js';

const PAGES = new Set(['home', 'markets', 'tools', 'calendar', 'platforms', 'contact', 'legal', 'portal']);
const TIERS = new Set(ACCOUNTS.map((a) => a.id));
const SYMBOL = /^[A-Z0-9]{3,8}$/;

/** Turn the model's chosen action into the steps the page knows how to run. */
export function stepsFor(action) {
  const a = String(action || 'none').trim();
  let m;
  if ((m = a.match(/^go:([a-z]+)(?:\/([a-z-]+))?$/)) && PAGES.has(m[1])) {
    const steps = [{ go: m[1], ...(m[2] ? { section: m[2] } : {}) }];
    const spot = m[2] ? `#${m[2] === 'accounts' ? 'accounts ul' : m[2]}` : { markets: '#terminal', tools: '#forex-calculators', calendar: '#economic-calendar', platforms: '#platforms-list', contact: '#contact-form', legal: '#legal-docs' }[m[1]];
    if (spot) steps.push({ spot });
    return steps;
  }
  if ((m = a.match(/^show_account:([a-z]+)$/)) && TIERS.has(m[1])) return [{ go: 'home', section: 'accounts' }, { spot: `#account-${m[1]}` }];
  if ((m = a.match(/^open_account(?::([a-z]+))?$/))) return [{ openAccount: true, ...(m[1] && TIERS.has(m[1]) ? { tier: m[1] } : {}) }];
  if ((m = a.match(/^show_instrument:([A-Za-z0-9/]+)$/))) {
    const sym = m[1].toUpperCase().replace('/', '');
    if (SYMBOL.test(sym)) return [{ go: 'markets', section: 'terminal' }, { instrument: sym }, { spot: '#terminal' }];
  }
  return [];
}
