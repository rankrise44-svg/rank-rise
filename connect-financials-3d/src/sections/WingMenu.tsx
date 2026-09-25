import { MENU, menuElements } from '../scene/eagle/anchors';
import { scrollToId } from '../story/smoothScroll';
import { openAccount } from '../ui/openAccount';

/**
 * Beat 3. The main options stand on the spread wings. On wide screens each
 * link is pinned to a point on its wing by the scene's projector; on phones
 * they drop into a two-column grid under the eagle (hidden with reduced
 * motion, where the hero CTAs own that space — the Menu button still has
 * every option). Always real links.
 */
export function WingMenu({ reduced = false }: { reduced?: boolean }) {
  return (
    <nav aria-label="Explore" data-wing-menu className={`absolute inset-0 ${reduced ? 'max-md:hidden' : ''}`}>
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
            <a
              href={`#${m.id}`}
              data-wing-item
              onClick={(e) => (e.preventDefault(), m.id === 'open-account' ? openAccount() : scrollToId(m.id))}
              className={`pointer-events-auto invisible flex items-center gap-2 rounded-full border border-gold/30 bg-abyss/60 px-4 py-2.5 text-[13px] font-semibold uppercase tracking-[0.16em] text-ink opacity-0 backdrop-blur-md transition-colors hover:border-gold-hi hover:text-gold-hi md:-translate-x-1/2 md:-translate-y-full md:whitespace-nowrap ${
                m.id === 'open-account' ? 'border-gold-hi/70 text-gold-hi shadow-[0_0_24px_rgba(212,175,55,0.35)]' : ''
              }`}
            >
              <span className="num text-[10px] text-gold">0{i + 1}</span>
              {m.label}
              <span className="ml-auto hidden h-1.5 w-1.5 rounded-full bg-gold-hi shadow-[0_0_8px_#F5D27A] md:ml-0 md:block" aria-hidden />
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
