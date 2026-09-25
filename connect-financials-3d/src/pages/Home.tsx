import { useMemo } from 'react';
import { detectQuality, prefersReducedMotion } from '../lib/device';
import { Stage } from '../scene/Stage';
import { Footer } from '../sections/Footer';
import { HeroTitle } from '../sections/HeroTitle';
import { PriceCards } from '../sections/PriceCards';
import { StubSections } from '../sections/Stubs';
import { WingMenu } from '../sections/WingMenu';
import { BEATS, STORY_LENGTH } from '../story/state';
import { useStoryTimeline } from '../story/useStoryTimeline';
import { TickerBar } from '../ui/TickerBar';
import { TopNav } from '../ui/TopNav';

export default function Home() {
  const quality = useMemo(detectQuality, []);
  const reduced = useMemo(prefersReducedMotion, []);
  useStoryTimeline(reduced);

  return (
    <>
      <Stage quality={quality} still={reduced} />
      <TickerBar />
      <TopNav />

      {/* Fixed HTML layers over the canvas, driven by the master timeline */}
      <div data-story-layer className="pointer-events-none fixed inset-0 z-10 pt-24">
        <div className="relative h-full">
          <HeroTitle />
          {!reduced && <PriceCards />}
          <WingMenu reduced={reduced} />
        </div>
      </div>

      <main id="top" className="relative outline-none">
        {/* The scroll track. Its height sets the pace of the story. */}
        <section id="story" aria-label="Connect Financials story" className="relative" style={{ height: reduced ? '100vh' : `${STORY_LENGTH * 100 + 100}vh` }}>
          {!reduced &&
            BEATS.map((b) => (
              <div key={b.id} id={`beat-${b.id}`} className="absolute left-0 w-px" style={{ top: `${b.at * 100}vh` }}>
                <span className="sr-only">{b.title}</span>
              </div>
            ))}
        </section>
        <StubSections />
      </main>
      <Footer />
    </>
  );
}
