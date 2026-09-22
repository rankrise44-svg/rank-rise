import { useEffect, useRef, useState } from 'react';

const IMAGES = [
  'https://motionsites.ai/assets/hero-space-voyage-preview-eECLH3Yc.gif',
  'https://motionsites.ai/assets/hero-codenest-preview-Cgppc2qV.gif',
  'https://motionsites.ai/assets/hero-vex-ventures-preview-BczMFIiw.gif',
  'https://motionsites.ai/assets/hero-stellar-ai-v2-preview-DjvxjG3C.gif',
  'https://motionsites.ai/assets/hero-asme-preview-B_nGDnTP.gif',
  'https://motionsites.ai/assets/hero-transform-data-preview-Cx5OU29N.gif',
  'https://motionsites.ai/assets/hero-vitara-preview-Cjz2QYyU.gif',
  'https://motionsites.ai/assets/hero-terra-preview-BFjrCr7T.gif',
  'https://motionsites.ai/assets/hero-skyelite-preview-DHaZIgUv.gif',
  'https://motionsites.ai/assets/hero-aethera-preview-DknSlcTa.gif',
  'https://motionsites.ai/assets/hero-designpro-preview-D8c5_een.gif',
  'https://motionsites.ai/assets/hero-stellar-ai-preview-D3HL6bw1.gif',
  'https://motionsites.ai/assets/hero-xportfolio-preview-D4A8maiC.gif',
  'https://motionsites.ai/assets/hero-orbit-web3-preview-BXt4OttD.gif',
  'https://motionsites.ai/assets/hero-nexora-preview-cx5HmUgo.gif',
  'https://motionsites.ai/assets/hero-evr-ventures-preview-DZxeVFEX.gif',
  'https://motionsites.ai/assets/hero-planet-orbit-preview-DWAP8Z1P.gif',
  'https://motionsites.ai/assets/hero-new-era-preview-CocuDUm9.gif',
  'https://motionsites.ai/assets/hero-wealth-preview-B70idl_u.gif',
  'https://motionsites.ai/assets/hero-luminex-preview-CxOP7ce6.gif',
  'https://motionsites.ai/assets/hero-celestia-preview-0yO3jXO8.gif',
];

const ROW_ONE = IMAGES.slice(0, 11);
const ROW_TWO = IMAGES.slice(11);

// Tripled so the strip never runs out of tiles while it travels.
const triple = (row: string[]) => [...row, ...row, ...row];

const TILE_W = 420;
const GAP = 12; // gap-3
// Row one travels right, so it starts one full set to the left — otherwise it
// would drag a hole in behind it.
const ROW_ONE_LEAD = ROW_ONE.length * (TILE_W + GAP);

function Tile({ src, index }: { src: string; index: number }) {
  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      className="rounded-2xl object-cover shrink-0"
      style={{ width: 420, height: 270 }}
      data-index={index}
    />
  );
}

export default function MarqueeSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const node = sectionRef.current;
      if (!node) return;

      const sectionTop = node.offsetTop;
      const next =
        (window.scrollY - sectionTop + window.innerHeight) * 0.3;
      setOffset(next);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, []);

  const travel = offset - 200;

  return (
    <section
      ref={sectionRef}
      className="pt-24 sm:pt-32 md:pt-40 pb-10 overflow-hidden"
      style={{ background: '#0C0C0C' }}
      aria-hidden="true"
    >
      <div className="flex flex-col gap-3">
        <div
          className="flex gap-3"
          style={{
            marginLeft: -ROW_ONE_LEAD,
            transform: `translateX(${travel}px)`,
            willChange: 'transform',
          }}
        >
          {triple(ROW_ONE).map((src, i) => (
            <Tile key={`row1-${i}`} src={src} index={i} />
          ))}
        </div>

        <div
          className="flex gap-3"
          style={{
            transform: `translateX(${-travel}px)`,
            willChange: 'transform',
          }}
        >
          {triple(ROW_TWO).map((src, i) => (
            <Tile key={`row2-${i}`} src={src} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
