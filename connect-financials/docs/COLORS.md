# Colour system

Deep blue + metallic gold, with white rationed as a highlight.

**Blue carries structure** — every surface, border and neutral text tone is blue-
cast rather than grey. **Gold carries value** — the primary action, key figures,
rising prices, the brand mark. **White is rare**, so it still reads as emphasis.

Defined in [`src/styles/tokens.css`](../src/styles/tokens.css). Canvas charts
cannot read CSS variables, so they read
[`src/config/chartPalette.ts`](../src/config/chartPalette.ts) — **change both
together.**

## Surfaces

| Token | Hex | Use |
|---|---|---|
| `canvas` | `#050B1A` | Page background |
| `surface-1` | `#0A1428` | Cards, header, footer |
| `surface-2` | `#0F1B33` | Hover state, nested panels |
| `surface-3` | `#16253F` | Inputs, tags |
| `surface-raised` | `#1D3054` | Menus, tooltips |
| `line` | `#1E3055` | Default hairline |
| `line-strong` | `#2C4570` | Active / focused edge |

## Text

| Token | Hex | Use |
|---|---|---|
| `text-bright` | `#FFFFFF` | Headlines and the single most important number. Rationed. |
| `text` | `#E8EEF9` | Default copy |
| `text-muted` | `#9BB0CE` | Secondary copy, labels |
| `text-subtle` | `#6B82A6` | Eyebrows, captions, axis text |

## Blue

| Token | Hex | Use |
|---|---|---|
| `blue-bright` | `#4DA3FF` | Links, chart lines, technical accents |
| `blue` | `#2E7FE8` | Selected states, secondary series |
| `blue-deep` | `#1B5FC4` | Pressed states |
| `blue-quiet` | `#4DA3FF` @ 14% | Tinted fills, active nav |

## Metallic gold

| Token | Hex | Use |
|---|---|---|
| `gold-light` | `#F5DFA3` | The highlight band in the metal gradient |
| `accent` | `#D4AF37` | Primary action, key figures |
| `accent-hover` | `#E3C65C` | Hover |
| `accent-press` | `#A8821F` | Pressed, and the dark edge of the metal |
| `accent-quiet` | `#D4AF37` @ 14% | Badges, tinted fills |

Gold reads as metal, not flat yellow, because the gradient uses **four stops** —
dark edge → bright band off-centre → mid → dark again. A two-stop ramp looks
like paint. Utilities: `.bg-gold-metallic`, `.text-gold-gradient`, `.rule-gold`.

## Market direction

**Rising is gold, falling is blue** — the brand pair doing the job green/red
usually does.

| Token | Hex |
|---|---|
| `up` | `#D9B45A` |
| `down` | `#3E86D8` |

Contrast on `surface-1`: gold ≈ 8.9:1, blue ≈ 4.6:1 — both clear AA at text size.

> **Worth knowing:** traders read green/red instinctively, and every other
> platform they use will be green/red. This is a deliberate brand choice, not an
> oversight. To revert, change `--color-up` / `--color-down` in `tokens.css` and
> the matching `up` / `down` in `chartPalette.ts` — four lines, nothing else.

## Chart

| Element | Colour |
|---|---|
| Grid | `#4DA3FF` @ 7% |
| Axis text | `#6B82A6` |
| Bullish candle | `#D9B45A` |
| Bearish candle | `#3E86D8` |
| Moving average | `#D4AF37` |
| Volume | `#4DA3FF` @ 28% |
| Crosshair / last price | `#FFFFFF` on `#D4AF37` |
| Indicator series | gold → blue → light gold → deep blue → pale blue → dark gold |

Indicator colours stay inside the blue/gold family, so a chart with four
overlays still reads as one palette instead of a rainbow.

## Legacy remap

Twenty components were written against raw Tailwind hues (`bg-navy-900`,
`text-amber-300`, `border-cyan-500`). Rather than rewrite them all, `tokens.css`
redefines those hues:

- `navy-*` → the blue surface ramp
- `amber-*` / `yellow-*` / `gold-*` → the one gold
- `cyan-*` / `sky-*` / `blue-*` → brand blue
- `emerald-*` / `green-*` / `teal-*` → gold (rising)
- `rose-*` / `red-*` → blue (falling)
- `purple-*` / `indigo-*` / `violet-*` → blue, so the chart carries no third hue

**Every stop in a ramp needs a value.** A gap leaves Tailwind's default showing
through — which is exactly how the order-entry buttons kept rendering green and
red after the first pass.

New code should use the semantic tokens, not these names.
