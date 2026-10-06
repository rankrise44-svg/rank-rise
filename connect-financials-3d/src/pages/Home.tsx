import { useEffect, useMemo } from 'react';
import { detectQuality, prefersReducedMotion } from '../lib/device';
import { Stage } from '../scene/Stage';
import { AboutCopy } from '../sections/About';
import { Beat, Closing, DockFrame, SplitWords } from '../sections/Beats';
import { FlightLayer, FlightWords, TransformWords } from '../sections/FlightLayer';
import { Footer } from '../sections/Footer';
import { HeroTitle } from '../sections/HeroTitle';
import { PriceCards } from '../sections/PriceCards';
import { WingMenu } from '../sections/WingMenu';
import { AccountCards } from '../sections/accounts/AccountCards';
import { BEATS, STORY_LENGTH, story } from '../story/state';
import { useStoryTimeline } from '../story/useStoryTimeline';

/**
 * ?studio=<open 0–1>[&spin=<radians>] shows only the falcon, lit and posed,
 * for design review of the eagle itself.
 */
function Studio({ open }: { open: number }) {
  const quality = useMemo(detectQuality, []);
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    Object.assign(story, { open, reveal: 1, scan: 1, mix: 1, spin: Number(q.get('spin') ?? 0) });
  }, [open]);
  return <Stage quality={quality} still={false} />;
}

export default function Home() {
  const studio = new URLSearchParams(window.location.search).get('studio');
  return studio === null ? <Site /> : <Studio open={Number(studio) || 0} />;
}

function Site() {
  const quality = useMemo(detectQuality, []);
  const reduced = useMemo(prefersReducedMotion, []);
  useStoryTimeline(reduced);

  return (
    <>
      <Stage quality={quality} still={reduced} />

      {/* Fixed HTML layers over the canvas for beats 1–5, driven by the master timeline */}
      <div data-story-layer className="pointer-events-none fixed inset-0 z-10 pt-24">
        <div className="relative h-full">
          <HeroTitle />
          {!reduced && (
            <>
              <PriceCards />
              <FlightLayer />
              <FlightWords />
              <TransformWords />
            </>
          )}
          <WingMenu reduced={reduced} />
        </div>
      </div>

      <main id="top" data-page="home" className="relative outline-none">
        {/* Beats 1–5: the scroll track. Its height sets the pace of the story. */}
        <section id="story" aria-label="Connect Financials story" className="relative" style={{ height: reduced ? '100vh' : `${STORY_LENGTH * 100 + 100}vh` }}>
          {!reduced &&
            BEATS.map((b) => (
              <div key={b.id} id={`beat-${b.id}`} className="absolute left-0 w-px" style={{ top: `${b.at * 100}vh` }}>
                <span className="sr-only">{b.title}</span>
              </div>
            ))}
        </section>

        {/* 7 · 3D to card */}
        <Beat id="about" beat="card" eyebrow="About" title={<>About <span className="text-gold-hi">Connect</span></>}>
          <div className="mt-12 grid items-center gap-12 md:grid-cols-[minmax(0,0.8fr)_1fr]">
            <DockFrame id="about" className="mx-auto aspect-[3/4] w-full max-w-[380px]" caption="Connect Financials" />
            <AboutCopy />
          </div>
        </Beat>

        {/* 8 · Big split words */}
        <SplitWords />

        {/* 9 · Accounts */}
        <Beat
          id="accounts"
          beat="accounts"
          eyebrow="Accounts"
          title={<>Choose your <span className="text-gold-hi">account</span></>}
          intro="From a free practice account to raw-spread ECN pricing and institutional FIX access. Every live tier offers leverage up to 1:500. Higher leverage means higher risk."
        >
          <div data-rise className="mt-12">
            <AccountCards />
          </div>
        </Beat>

        {/* 12 · Closing */}
        <Closing />
      </main>
      <Footer />
    </>
  );
}
