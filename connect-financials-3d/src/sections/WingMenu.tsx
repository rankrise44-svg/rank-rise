import { MENU, menuElements, menuLines, type MenuId } from '../scene/eagle/anchors';
import { hrefFor, navigate } from '../lib/route';
import { openAccount } from '../ui/openAccount';

/**
 * Beat 3. The main options stand on the spread wings. On wide screens each
 * link is pinned to a point on its wing by the scene's projector; on phones
 * they drop into a two-column grid under the eagle (hidden with reduced
 * motion, where the hero CTAs own that space — the Menu button still has
 * every option). Always real links.
 *
 * Motion ("feather light", scrubbed by the story timeline): from the falcon's
 * chest a gold line of light traces out along the wing to each link, centre
 * links first, a spark runs ahead of it, and the link blooms where it lands.
 * While shown, the links ride the air gently; hovering one lights its line.
 */
const setHot = (id: MenuId, on: boolean) => menuLines[id]?.forEach((l) => l.toggleAttribute('data-hot', on));

export function WingMenu({ reduced = false }: { reduced?: boolean }) {
  return (
    <nav aria-label="Explore" data-wing-menu className={`absolute inset-0 ${reduced ? 'max-md:hidden' : ''}`}>
      <svg className="pointer-events-none absolute inset-0 hidden h-full w-full overflow-visible md:block" aria-hidden>
        <defs>
          <filter id="wing-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.4" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {MENU.map((m) => (
          <g
            key={m.id}
            ref={(g) => {
              if (g) menuLines[m.id] = Array.from(g.querySelectorAll('path'));
              else delete menuLines[m.id];
            }}
          >
            <path data-wing-line pathLength={1} className="wing-line" fill="none" stroke="#F5D27A" strokeWidth={1.4} strokeLinecap="round" strokeDasharray="1 1" strokeDashoffset={1} />
            <path data-wing-spark pathLength={1} fill="none" stroke="#FFF1C4" strokeWidth={3} strokeLinecap="round" strokeDasharray="0.04 2" strokeDashoffset={0.04} filter="url(#wing-glow)" />
          </g>
        ))}
      </svg>
      <ol className="absolute inset-x-4 bottom-[max(92px,10vh)] mx-auto grid max-w-md grid-cols-2 gap-2 md:static md:block md:max-w-none">
        {MENU.map((m, i) => (
          <li
            key={m.id}
            ref={(el) => {
              if (el) menuElements[m.id] = el;
              else delete menuElements[m.id];
            }}
            className="md:absolute md:left-0 md:top-0 md:will-change-transform"
          >
            <div className="wing-float" style={{ animationDelay: `${-i * 0.9}s` }}>
              <a
                href={m.page ? hrefFor(m.page, m.section) : '#open-account'}
                data-wing-item
                onClick={(e) => (e.preventDefault(), m.page ? navigate(m.page, m.section) : openAccount())}
                onPointerEnter={() => setHot(m.id, true)}
                onPointerLeave={() => setHot(m.id, false)}
                onFocus={() => setHot(m.id, true)}
                onBlur={() => setHot(m.id, false)}
                className={`wing-pill pointer-events-auto invisible flex h-12 items-center gap-2.5 rounded-xl border px-3 text-[11px] font-semibold uppercase tracking-[0.1em] sm:px-3.5 sm:text-[11.5px] sm:tracking-[0.14em] opacity-0 backdrop-blur-md transition-[color,background-color,border-color,box-shadow,scale] duration-300 active:scale-[0.98] md:h-auto md:gap-2 md:rounded-full md:px-4 md:py-2.5 md:text-[13px] md:tracking-[0.16em] md:-translate-x-1/2 md:-translate-y-full md:whitespace-nowrap ${
                  m.id === 'open-account'
                    ? 'border-gold bg-gold text-abyss shadow-[0_8px_30px_-10px_rgba(212,175,55,0.7)] hover:bg-gold-hi md:border-gold-hi/70 md:bg-abyss/60 md:text-gold-hi md:shadow-[0_0_24px_rgba(212,175,55,0.35)] md:hover:bg-abyss/60 md:hover:shadow-[0_0_28px_rgba(245,210,122,0.45)]'
                    : 'border-gold/20 bg-navy/70 text-ink hover:border-gold/60 hover:bg-navy-mid/80 md:border-gold/30 md:bg-abyss/60 md:hover:border-gold-hi md:hover:bg-abyss/60 md:hover:text-gold-hi md:hover:shadow-[0_0_28px_rgba(245,210,122,0.35)]'
                }`}
              >
                <span className={`num text-[10px] ${m.id === 'open-account' ? 'text-abyss/60 max-sm:hidden md:text-gold' : 'text-gold'}`}>0{i + 1}</span>
                <span className="truncate">{m.label}</span>
                <svg viewBox="0 0 16 16" className={`ml-auto h-3.5 w-3.5 shrink-0 md:hidden ${m.id === 'open-account' ? 'text-abyss' : 'text-gold/70'}`} fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
                  <path d="M6 3.5 10.5 8 6 12.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="wing-dot hidden h-1.5 w-1.5 rounded-full bg-gold-hi shadow-[0_0_8px_#F5D27A] md:block" aria-hidden />
              </a>
            </div>
          </li>
        ))}
      </ol>
    </nav>
  );
}
