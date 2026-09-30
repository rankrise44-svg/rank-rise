import { MENU, menuElements, menuLines, type MenuId } from '../scene/eagle/anchors';
import { scrollToId } from '../story/smoothScroll';
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
      <ol className="absolute inset-x-4 bottom-[8vh] grid grid-cols-2 gap-2 md:static md:block">
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
                href={`#${m.id}`}
                data-wing-item
                onClick={(e) => (e.preventDefault(), m.id === 'open-account' ? openAccount() : scrollToId(m.id))}
                onPointerEnter={() => setHot(m.id, true)}
                onPointerLeave={() => setHot(m.id, false)}
                onFocus={() => setHot(m.id, true)}
                onBlur={() => setHot(m.id, false)}
                className={`wing-pill pointer-events-auto invisible flex items-center gap-2 rounded-full border border-gold/30 bg-abyss/60 px-4 py-2.5 text-[13px] font-semibold uppercase tracking-[0.16em] text-ink opacity-0 backdrop-blur-md transition-[color,border-color,box-shadow] duration-300 hover:border-gold-hi hover:text-gold-hi hover:shadow-[0_0_28px_rgba(245,210,122,0.35)] md:-translate-x-1/2 md:-translate-y-full md:whitespace-nowrap ${
                  m.id === 'open-account' ? 'border-gold-hi/70 text-gold-hi shadow-[0_0_24px_rgba(212,175,55,0.35)]' : ''
                }`}
              >
                <span className="num text-[10px] text-gold">0{i + 1}</span>
                {m.label}
                <span className="wing-dot ml-auto hidden h-1.5 w-1.5 rounded-full bg-gold-hi shadow-[0_0_8px_#F5D27A] md:ml-0 md:block" aria-hidden />
              </a>
            </div>
          </li>
        ))}
      </ol>
    </nav>
  );
}
