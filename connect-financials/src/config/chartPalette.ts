/**
 * Chart colours.
 *
 * The terminals draw to <canvas>, which cannot read CSS custom properties, so
 * these values are kept in step with src/styles/tokens.css by hand. Change a
 * colour here and in tokens.css together.
 *
 * Scheme: blue structure, metallic gold for value.
 *  - Grid, axes and frame are blue — they recede.
 *  - Rising price is gold, falling price is blue.
 *  - White is reserved for the crosshair readout and the last-price label,
 *    which are the two things a trader looks for first.
 */

export const chart = {
  /* Frame */
  background: '#071734',
  panel: '#0b2044',
  panelAlt: '#0f2851',
  border: '#1d3c6e',
  borderStrong: '#2a4f8a',

  /* Grid — low-contrast blue so candles sit clearly on top of it. */
  grid: 'rgba(77, 163, 255, 0.07)',
  gridStrong: 'rgba(77, 163, 255, 0.13)',

  /* Axis and label text */
  axisText: '#6b82a6',
  labelText: '#9bb0ce',
  brightText: '#ffffff',

  /* Direction. Mirrors --color-up / --color-down in tokens.css.
     Flip this pair (and those two tokens) to return to green/red. */
  up: '#d9b45a',
  upFill: 'rgba(217, 180, 90, 0.22)',
  upWick: '#b8923c',
  down: '#3e86d8',
  downFill: 'rgba(62, 134, 216, 0.22)',
  downWick: '#2b6bb8',

  /* Accent — gold. Crosshair, last-price marker, primary series. */
  accent: '#d4af37',
  accentBright: '#f5dfa3',
  accentDim: 'rgba(212, 175, 55, 0.35)',

  /* Blue family for secondary series, indicators and volume. */
  blue: '#2e7fe8',
  blueBright: '#4da3ff',
  blueDim: 'rgba(77, 163, 255, 0.3)',
  volume: 'rgba(77, 163, 255, 0.28)',

  /* Indicator series. Deliberately all inside the blue/gold family so a chart
     with four overlays still reads as one palette. */
  series: ['#d4af37', '#4da3ff', '#f5dfa3', '#2e7fe8', '#8fbdf0', '#a8821f'],
} as const;
