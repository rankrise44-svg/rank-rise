/* ═══════════════════════════════════════════════════════════════════════
   Brand constants.

   Product naming lives in exactly one place so it can be changed in one
   edit — the name is the cheapest thing to change now and the most
   expensive once it is scattered across thirty files.
   ═══════════════════════════════════════════════════════════════════════ */

export const PRODUCT = {
  house:   'RankRise',
  name:    'Ascend',
  full:    'RankRise Ascend',
  tagline: 'Diagnose the business. Then build the plan.',
  promise: 'We build brands that rise.',   // the agency's own line, from rankrise.media
};

/* The RankRise mark, lifted verbatim from the site's sprite so the product
   and the site render the identical path rather than two drifting copies. */
export const MARK = `<svg viewBox="0 0 2270 2008" aria-hidden="true"><path fill="currentColor" d="M 798.2,368.2 C 447.0,719.7 465.9,700.2 451.9,724.2 C 437.1,749.7 427.6,779.6 424.9,810.0 C 423.6,823.3 423.3,1175.0 424.5,1175.0 C 425.0,1175.0 583.5,1016.8 776.8,823.5 L 1128.3,472.0 L 1341.3,685.0 L 1554.3,898.0 L 1452.8,999.5 L 1351.3,1101.0 L 1239.7,989.4 L 1128.1,877.8 L 584.2,1422.0 C 285.1,1721.3 40.1,1966.6 40.0,1967.1 C 39.7,1967.7 108.8,1967.9 229.5,1967.7 C 405.3,1967.4 420.1,1967.3 429.8,1965.7 C 469.5,1959.0 501.8,1944.8 531.7,1920.8 C 535.9,1917.4 671.8,1782.3 833.8,1620.4 L 1128.3,1326.1 L 1422.8,1620.3 C 1584.8,1782.2 1720.9,1917.4 1725.3,1921.0 C 1754.9,1944.5 1787.8,1959.1 1826.8,1965.6 C 1836.6,1967.3 1850.8,1967.4 2027.1,1967.7 C 2131.4,1967.9 2216.8,1967.7 2216.8,1967.3 C 2216.8,1966.9 2069.2,1818.9 1888.8,1638.5 L 1560.8,1310.5 L 1770.0,1101.3 L 1979.3,892.0 L 1553.3,466.0 C 1319.0,231.7 1127.1,40.0 1126.8,40.0 C 1126.5,40.0 978.7,187.7 798.2,368.2"/></svg>`;

/* The five stages. The rail renders these; the router keys off them. */
export const STAGES = [
  { id: 'consult',  label: 'Consult'  },
  { id: 'diagnose', label: 'Diagnose' },
  { id: 'plan',     label: 'Plan'     },
  { id: 'create',   label: 'Create'   },
  { id: 'run',      label: 'Run'      },
];

/* Score → colour and band. One function, used by the ring, the pillars and
   the summary, so a 68 is never amber in one place and green in another. */
export function scoreColor(n) {
  if (n >= 70) return 'var(--good)';
  if (n >= 45) return 'var(--warn)';
  return 'var(--bad)';
}

export const SEVERITY = {
  blocker:  { tag: 'tag-bad',  label: 'Blocker'  },
  watch:    { tag: 'tag-warn', label: 'Watch'    },
  strength: { tag: 'tag-good', label: 'Strength' },
};

export const EFFORT = {
  quick:  'under an hour',
  medium: 'a few days',
  heavy:  'weeks, or outside help',
};
