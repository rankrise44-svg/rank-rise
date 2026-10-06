import { COMPANY, RISK_WARNING_SHORT } from '../config/company';
import { PAGES, type PageId } from '../config/pages';
import { ACCOUNT_TIERS, ECONOMIC_EVENTS } from '../data/market';
import { formatPrice, market } from '../feed/market';
import type { Intent, ValgonReply } from './types';

/**
 * Valgon's built-in knowledge: what he can answer and where he can take people.
 * Everything here comes from the site's own data (accounts, prices, calendar,
 * company details), so he never says anything the site doesn't.
 *
 * To teach him something new, add an Intent: a few patterns that recognise the
 * question and a respond() that returns what to say and where to go.
 * A remote database or AI service can be added in brain.ts / config.ts without
 * touching this file.
 */

const tiers = ACCOUNT_TIERS;
const live = tiers.filter((t) => t.id !== 'demo');
const money = (n: number) => `$${n.toLocaleString('en-US')}`;
const leverageWords = (l: string) => l.replace(/1:(\d+)/, '1 to $1');

/* ── instruments people ask about by name ── */
const INSTRUMENT_NAMES: [RegExp, string][] = [
  [/\b(gold|xau)\b/i, 'XAUUSD'],
  [/\b(silver|xag)\b/i, 'XAGUSD'],
  [/\b(platinum|xpt)\b/i, 'XPTUSD'],
  [/\b(bitcoin|btc)\b/i, 'BTCUSD'],
  [/\b(ethereum|eth|ether)\b/i, 'ETHUSD'],
  [/\b(brent)\b/i, 'BRENT'],
  [/\b(wti|crude|oil)\b/i, 'WTI'],
  [/\b(nasdaq|nas100|us tech)\b/i, 'NAS100'],
  [/\b(dow|us30|wall st(reet)?)\b/i, 'US30'],
  [/\b(s ?& ?p|spx|sp500|us ?500)\b/i, 'SPX500'],
  [/\b(dax|ger40)\b/i, 'GER40'],
  [/\b(euro|eur ?usd|eurusd)\b/i, 'EURUSD'],
  [/\b(pound|cable|gbp ?usd|gbpusd)\b/i, 'GBPUSD'],
  [/\b(yen|usd ?jpy|usdjpy)\b/i, 'USDJPY'],
];

export function findInstrument(message: string): string | null {
  const compact = message.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const { instruments } = market.getSnapshot();
  const direct = instruments.find((i) => compact.includes(i.id));
  if (direct) return direct.id;
  return INSTRUMENT_NAMES.find(([re]) => re.test(message))?.[1] ?? null;
}

function tierFrom(message: string) {
  const m = message.toLowerCase();
  if (/islam|sharia|swap[- ]?free|halal/.test(m)) return tiers.find((t) => t.id === 'islamic');
  if (/\bdemo\b|practi[cs]e|paper/.test(m)) return tiers.find((t) => t.id === 'demo');
  if (/\bvip\b|institution|fix api|fund/.test(m)) return tiers.find((t) => t.id === 'vip');
  if (/\braw\b|ecn|scalp|algo/.test(m)) return tiers.find((t) => t.id === 'raw');
  if (/\bplus\b|popular/.test(m)) return tiers.find((t) => t.id === 'plus');
  if (/\bstandard\b|beginner|basic|first/.test(m)) return tiers.find((t) => t.id === 'standard');
  return undefined;
}

const contactLinks = [
  { label: COMPANY.emails.support, href: `mailto:${COMPANY.emails.support}` },
  { label: 'Telegram', href: COMPANY.social.telegram },
  { label: 'WhatsApp', href: COMPANY.social.whatsapp },
];

const pageIntent = (id: string, page: PageId, patterns: RegExp[], keywords: string[], say: string, section?: string, spot?: string): Intent => ({
  id,
  patterns,
  keywords,
  respond: () => ({
    say,
    steps: [{ go: page, section }, ...(spot ? [{ spot }] : [])],
    suggestions: PAGES[page].suggestions,
  }),
});

export const INTENTS: Intent[] = [
  /* ── greetings and help ── */
  {
    id: 'hello',
    priority: -1,
    patterns: [/^(hi|hello|hey|yo|good (morning|afternoon|evening)|salam|marhaba)\b/i],
    respond: () => ({
      say: `Hello. I am Valgon, your guide to ${COMPANY.brand}. Tell me where you want to go, or ask me about the accounts, the markets or the tools.`,
      suggestions: PAGES.valgon.suggestions,
    }),
  },
  {
    id: 'help',
    patterns: [/what can you do|help me|how does this work|who are you|what are you|options|menu/i],
    respond: () => ({
      say: 'I can take you anywhere on the site: the falcon home page, the accounts, Connect View with live charts and the order book, the calculators, the economic calendar, the platforms, contact and legal. I can also answer questions about accounts, deposits, spreads and leverage, and open an account form for you.',
      suggestions: ['Show me the falcon', 'Compare the accounts', 'Open Connect View', 'Give me a tour'],
    }),
  },
  {
    id: 'tour',
    patterns: [/\btour\b|show me (around|everything)|everything|walk me through|a ?to ?z|all (the )?pages/i],
    respond: () => ({
      say: 'With pleasure. A short tour of the whole site.',
      steps: [
        { go: 'home' },
        { say: 'This is home: the falcon, who we are, and the accounts.' },
        { go: 'home', section: 'accounts' },
        { spot: '#accounts ul' },
        { say: `Six accounts, from a free demo to VIP institutional. Live accounts start at ${money(Math.min(...live.map((t) => t.minDeposit)))}.` },
        { go: 'markets', section: 'terminal' },
        { spot: '#terminal' },
        { say: 'Connect View: the market watch, the chart from one minute to daily, and the order book.' },
        { go: 'tools' },
        { spot: '#forex-calculators' },
        { say: 'The calculators: pip value, margin, position size and profit, plus capital and risk.' },
        { go: 'calendar' },
        { spot: '#economic-calendar' },
        { say: 'The economic calendar, filtered by impact.' },
        { go: 'platforms' },
        { say: 'The platforms and partners. And contact and legal are always in the header.' },
        { say: 'That is the whole site. Where would you like to go?' },
      ],
      suggestions: ['Open an account', 'Compare the accounts', 'Talk to a person'],
    }),
  },

  /* ── places ── */
  pageIntent('home', 'home', [/falcon|eagle|home ?page|\bhome\b|main page|the website|enter|start|landing/i], ['site', 'website'], 'Taking you to the falcon.'),
  pageIntent('about', 'home', [/about (you|connect|the company|us)|who is connect|company/i], ['history', 'story'], `Here is ${COMPANY.brand}: ${COMPANY.description}`, 'about', '#about'),
  pageIntent('markets', 'markets', [/connect ?view|chart|market watch|order book|depth|terminal|live (prices|markets)|markets?/i], ['trade', 'trading', 'candles', 'quotes'], 'Opening Connect View: live market watch, charts and the order book.', 'terminal', '#terminal'),
  pageIntent('currencies', 'markets', [/currenc(y|ies) strength|strength|sessions?|tokyo|london|new york|sydney|open now/i], [], 'Here are currency strength and the trading sessions, in UTC.', 'currencies', '#currencies'),
  pageIntent('tools', 'tools', [/tools?|calculat|pip value|margin calc|position siz|lot siz|size (a |my )?(position|trade|lot)|how (many|much) lots|profit|risk of ruin/i], ['size', 'lots'], 'Opening the calculators: pip value, margin, position size and profit and loss, plus capital and risk.', 'forex-calculators', '#forex-calculators'),
  pageIntent('calendar', 'calendar', [/calendar|economic|events?|news|cpi|nfp|payrolls|interest rate|fomc/i], ['inflation'], `Opening the economic calendar. ${ECONOMIC_EVENTS.filter((e) => e.impact === 'high').length} of the ${ECONOMIC_EVENTS.length} sample events are high impact.`, 'economic-calendar', '#economic-calendar'),
  pageIntent('platforms', 'platforms', [/platforms?|download|mt4|mt5|metatrader|app|mobile app|desktop|web trader|partners?|\bib\b|introducing broker/i], [], 'Here are the trading platforms and partners.', 'platforms-list', '#platforms-list'),
  pageIntent('contact', 'contact', [/contact|reach you|phone|call (you|me)|address|office/i], [], `Here is how to reach the team. You can also email ${COMPANY.emails.support}.`, 'contact-form', '#contact-form'),
  pageIntent('legal', 'legal', [/legal|terms|privacy|policy|disclosure|aml|kyc rules|complaint/i], [], 'Opening the legal documents and the risk disclosure.', 'legal-docs', '#legal-docs'),
  {
    id: 'portal',
    patterns: [/portal|log ?in|sign ?in|my account|dashboard|client area/i],
    respond: () => ({ say: 'Opening the Trader Portal. It is a preview with sample data.', steps: [{ go: 'portal' }] }),
  },
  {
    id: 'valgon',
    patterns: [/talk to (you|valgon)|back to (you|valgon)|valgon page/i],
    respond: () => ({ say: 'I am right here.', steps: [{ go: 'valgon' }] }),
  },

  /* ── accounts ── */
  {
    id: 'account-one',
    priority: 1,
    patterns: [/\b(standard|plus|raw|vip|islamic|demo)\b.*(account|tier)?|swap[- ]?free|sharia|ecn|scalp/i],
    respond: (m) => {
      const t = tierFrom(m);
      if (!t) return accountsOverview();
      const dep = t.minDeposit > 0 ? `starts at ${money(t.minDeposit)}` : 'needs no deposit';
      return {
        say: `The ${t.name} ${dep}. Spreads: ${t.spread.toLowerCase()}. Commission: ${t.commission.toLowerCase()}. ${t.execution}, leverage ${leverageWords(t.leverage).toLowerCase()}. It is aimed at ${t.badge.toLowerCase()}.`,
        steps: [{ go: 'home', section: 'accounts' }, { spot: `#account-${t.id}` }],
        suggestions: [`Open a ${t.id === 'demo' ? 'demo' : t.name.split(' ')[0]} account`, 'Compare the accounts', 'Deposits and withdrawals'],
      };
    },
  },
  {
    id: 'accounts',
    patterns: [/accounts?|tiers?|compare|which account|best account|suit(s)? me|for me|minimum deposit|min(imum)? to (start|open)/i],
    keywords: ['deposit', 'beginner'],
    respond: () => accountsOverview(),
  },
  {
    id: 'open-account',
    priority: 2,
    patterns: [/\bopen (an? |my )?([a-z-]+ ){0,2}account\b|sign ?up|register|create (an? )?([a-z-]+ )?account|\bjoin\b|start trading/i],
    respond: (m) => {
      const t = tierFrom(m);
      return {
        say: t ? `Opening the account form on the ${t.name}.` : 'Opening the account form. It takes a few minutes.',
        steps: [{ openAccount: true, tier: t?.id }],
      };
    },
  },

  /* ── money questions ── */
  {
    id: 'funding',
    patterns: [/deposit|withdraw|fund(ing)?|payment|pay ?(in|out)|usdt|trc ?20|card|bank wire|wire transfer/i],
    respond: () => ({
      say: `First deposits start at ${live.map((t) => `${money(t.minDeposit)} for ${t.name.replace(' Account', '')}`).join(', ')}. The Trader Portal lists bank wire, card and USDT on TRC20. For processing times and limits, the support team will confirm by email.`,
      links: contactLinks.slice(0, 1),
      suggestions: ['Compare the accounts', 'Open an account', 'Talk to a person'],
    }),
  },
  {
    id: 'fees',
    patterns: [/spreads?|fees?|commission|costs?|charges?|cheap|swap(s)? rate/i],
    respond: () => ({
      say: `Spreads and commission by account: ${live.map((t) => `${t.name.replace(' Account', '')}, ${t.spread.toLowerCase()}, ${t.commission.toLowerCase()}`).join('. ')}.`,
      steps: [{ go: 'home', section: 'accounts' }, { spot: '#accounts ul' }],
      suggestions: ['What is the Raw account?', 'Open an account'],
    }),
  },
  {
    id: 'leverage',
    patterns: [/leverage|margin|1 ?: ?\d+/i],
    respond: () => ({
      say: `Every account offers leverage ${leverageWords(tiers[0].leverage).toLowerCase()}. Leverage magnifies losses as well as gains. The margin calculator shows what a position needs.`,
      steps: [{ go: 'tools', section: 'forex-calculators' }, { spot: '#forex-calculators' }],
    }),
  },
  {
    id: 'price',
    priority: 1,
    patterns: [/price|quote|how much is|trading at|rate of/i],
    respond: (m) => {
      const id = findInstrument(m);
      const inst = id ? market.getSnapshot().byId[id] : null;
      if (!inst) return { say: 'Which instrument? Try gold, Bitcoin, euro dollar or the Nasdaq.', suggestions: ['Price of gold', 'Price of Bitcoin', 'Open Connect View'] };
      return {
        say: `${inst.name} is at ${formatPrice(inst)} bid, ${formatPrice(inst, inst.ask)} ask. These are indicative prices from a simulated feed.`,
        steps: [{ go: 'markets', section: 'terminal' }, { instrument: inst.id }, { spot: '#terminal' }],
      };
    },
  },
  {
    id: 'instrument-chart',
    priority: 1,
    patterns: [/\b(show|open|chart|see|view|display)\b/i],
    when: (m) => findInstrument(m) !== null,
    respond: (m) => {
      const id = findInstrument(m);
      const inst = id ? market.getSnapshot().byId[id] : null;
      if (!inst) return { say: 'Opening Connect View.', steps: [{ go: 'markets', section: 'terminal' }, { spot: '#terminal' }] };
      return {
        say: `Here is ${inst.name} in Connect View.`,
        steps: [{ go: 'markets', section: 'terminal' }, { instrument: inst.id }, { spot: '#terminal' }],
      };
    },
  },
  {
    id: 'instruments',
    patterns: [/instruments?|what can i trade|symbols|assets|crypto|indices|metals|forex pairs|commodit/i],
    respond: () => {
      const n = market.getSnapshot().instruments.length;
      return {
        say: `In Connect View you can follow ${n} instruments: forex majors and crosses, gold, silver and platinum, global indices, oil and crypto.`,
        steps: [{ go: 'markets', section: 'terminal' }, { spot: '#terminal' }],
      };
    },
  },

  /* ── trust ── */
  {
    id: 'regulation',
    patterns: [/regulat|licen[cs]e|authori[sz]ed|safe|legit|scam|trust(worthy)?|fsa/i],
    respond: () => ({
      say: `The regulators and licence numbers are listed on our legal page, with the registered address. For anything specific, the compliance team answers at ${COMPANY.emails.compliance}.`,
      steps: [{ go: 'legal', section: 'legal-docs' }, { spot: '#legal-docs' }],
      links: [{ label: COMPANY.emails.compliance, href: `mailto:${COMPANY.emails.compliance}` }],
    }),
  },
  {
    id: 'person',
    patterns: [/human|\bperson\b|agent|someone|support|help ?desk|customer service|telegram|whatsapp|email/i],
    respond: () => ({
      say: 'The team can help you directly by email, Telegram or WhatsApp. I have put the links below.',
      links: contactLinks,
      steps: [{ go: 'contact', section: 'contact-form' }],
    }),
  },

  /* ── no advice ── */
  {
    id: 'advice',
    priority: 3,
    patterns: [/should i (buy|sell|trade|invest)|will .* (go up|go down|rise|fall)|signal|tip|predict|guarantee|make money|profit (fast|quick)|recommend (a )?trade/i],
    respond: () => ({
      say: `I cannot give trading advice or predictions. ${RISK_WARNING_SHORT} The demo account lets you practise with no money at risk.`,
      suggestions: ['Tell me about the demo account', 'Open the calculators', 'Open the economic calendar'],
    }),
  },

  /* ── small talk / controls ── */
  {
    id: 'thanks',
    priority: -1,
    patterns: [/^(thanks|thank you|thx|cheers|great|perfect|ok(ay)?)\b/i],
    respond: () => ({ say: 'My pleasure. Anything else?' }),
  },
];

function accountsOverview(): ValgonReply {
  return {
    say: `There are six accounts. ${live.map((t) => `${t.name.replace(' Account', '')} from ${money(t.minDeposit)}`).join(', ')}, and a free practice demo. Standard suits beginners, Raw suits scalpers and algorithmic traders, and Islamic is swap-free.`,
    steps: [{ go: 'home', section: 'accounts' }, { spot: '#accounts ul' }],
    suggestions: ['What is the Raw account?', 'Tell me about the Islamic account', 'Open an account'],
  };
}

export const FALLBACK: ValgonReply = {
  say: 'I did not catch that. I can take you to the falcon, the accounts, Connect View, the calculators, the calendar, the platforms or contact, and answer questions about accounts, deposits, spreads and leverage.',
  suggestions: ['Show me the falcon', 'Compare the accounts', 'Open Connect View', 'Talk to a person'],
};

