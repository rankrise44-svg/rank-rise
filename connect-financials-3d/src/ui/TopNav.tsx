import { hrefFor, navigate, useRoute } from '../lib/route';
import logo from '../assets/logo.svg';

/**
 * The site header: just the logo and the name, under the price ticker. The
 * logo leads back to the universe, where every page is a planet; Valgon (in the
 * corner of every page) can take people anywhere too. The universe shows the
 * logo and the name large in its centre, so there the header stays empty.
 */
export function TopNav() {
  const { page } = useRoute();
  if (page === 'universe') return null;
  return (
    <header className="pointer-events-none fixed inset-x-0 top-8 z-40 flex h-16 items-center bg-gradient-to-b from-abyss/80 to-transparent px-4 sm:px-8">
      <a
        href={hrefFor('universe')}
        onClick={(e) => {
          e.preventDefault();
          navigate('universe');
        }}
        className="pointer-events-auto flex shrink-0 items-center gap-2.5"
        aria-label="Connect Financials — back to the universe"
      >
        <img src={logo} alt="" width={48} height={30} className="h-8 w-auto" />
        <span className="font-display text-[13px] font-semibold uppercase tracking-[0.28em] text-ink">
          Connect <span className="text-gold">Financials</span>
        </span>
      </a>
    </header>
  );
}
