import { useMemo } from 'react';
import { detectQuality, prefersReducedMotion } from '../lib/device';
import { Stage } from '../scene/Stage';
import { AboutCopy } from '../sections/About';
import { Beat, Closing, DockFrame, SplitWords } from '../sections/Beats';
import { FlightLayer, FlightWords, TransformWords } from '../sections/FlightLayer';
import { Footer } from '../sections/Footer';
import { HeroTitle } from '../sections/HeroTitle';
import { Contact, Legal } from '../sections/LegalContact';
import { PlatformsPartners } from '../sections/PlatformsPartners';
import { PriceCards } from '../sections/PriceCards';
import { WingMenu } from '../sections/WingMenu';
import { AccountCards } from '../sections/accounts/AccountCards';
import { Currencies } from '../sections/markets/Currencies';
import { MarketsTerminal } from '../sections/markets/MarketsTerminal';
import { CapitalRiskCalculator } from '../sections/tools/CapitalRiskCalculator';
import { EconomicCalendar } from '../sections/tools/EconomicCalendar';
import { ForexCalculators } from '../sections/tools/ForexCalculators';
import { BEATS, STORY_LENGTH } from '../story/state';
import { useStoryTimeline } from '../story/useStoryTimeline';
import { LiveSupportChat } from '../ui/LiveSupportChat';
import { OpenAccountModal } from '../ui/OpenAccountModal';
import { TickerBar } from '../ui/TickerBar';
import { TopNav } from '../ui/TopNav';

const H3 = ({ children }: { children: React.ReactNode }) => (
  <h3 className="mb-6 flex items-center gap-4 font-display text-lg font-semibold uppercase tracking-[0.12em] text-ink">
    {children}
    <span className="gold-line flex-1 opacity-60" aria-hidden />
  </h3>
);

export default function Home() {
  const quality = useMemo(detectQuality, []);
  const reduced = useMemo(prefersReducedMotion, []);
  useStoryTimeline(reduced);

  return (
    <>
      <Stage quality={quality} still={reduced} />
      <TickerBar />
      <TopNav />

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

      <main id="top" className="relative outline-none">
        {/* Beats 1–5: the scroll track. Its height sets the pace of the story. */}
        <section id="story" aria-label="Connect Financials story" className="relative" style={{ height: reduced ? '100vh' : `${STORY_LENGTH * 100 + 100}vh` }}>
          {!reduced &&
            BEATS.map((b) => (
              <div key={b.id} id={`beat-${b.id}`} className="absolute left-0 w-px" style={{ top: `${b.at * 100}vh` }}>
                <span className="sr-only">{b.title}</span>
              </div>
            ))}
        </section>

        {/* 6 · Markets */}
        <Beat
          id="trade"
          beat="markets"
          eyebrow="Markets"
          title={
            <>
              Live markets, <span className="text-gold-hi">one account</span>
            </>
          }
          intro="Forex majors and crosses, gold, silver and platinum, global indices, oil and crypto CFDs. Watch the spread, read the chart and see the depth before you trade."
        >
          <div className="grid items-end gap-8 lg:grid-cols-[1fr_minmax(0,0.9fr)]">
            <div />
            <DockFrame id="markets" className="-mt-40 hidden h-[44vh] lg:block" caption="Indicative prices · simulated feed" />
          </div>
          <div data-tilt className="mt-12 [perspective:1600px]">
            <div className="[transform-style:preserve-3d]">
              <MarketsTerminal />
            </div>
          </div>
          <div className="mt-20">
            <H3>Currencies</H3>
            <Currencies />
          </div>
        </Beat>

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

        {/* 10 · Tools */}
        <Beat id="tools" beat="tools" eyebrow="Tools" title={<>Plan every <span className="text-gold-hi">trade</span></>} intro="Size positions, check margin and see what a losing streak would do to your capital before you risk it.">
          <div className="mt-12 grid gap-10">
            <div data-rise>
              <H3>Forex calculators</H3>
              <ForexCalculators />
            </div>
            <div data-rise>
              <H3>Capital & risk</H3>
              <CapitalRiskCalculator />
            </div>
            <div data-rise>
              <H3>Economic calendar</H3>
              <EconomicCalendar />
            </div>
          </div>
        </Beat>

        {/* 11 · Platforms & partners */}
        <Beat id="platforms" beat="partners" eyebrow="Platforms" title={<>Platforms & <span className="text-gold-hi">partners</span></>}>
          <div data-rise className="mt-12">
            <PlatformsPartners />
          </div>
        </Beat>

        <Beat id="legal" beat="legal" eyebrow="Legal" title="Legal & regulation">
          <div className="mt-10">
            <Legal />
          </div>
        </Beat>
        <Beat id="contact" beat="contact" eyebrow="Contact" title={<>Talk to <span className="text-gold-hi">us</span></>}>
          <div className="mt-10">
            <Contact />
          </div>
        </Beat>

        {/* 12 · Closing */}
        <Closing />
      </main>
      <Footer />

      <OpenAccountModal />
      <LiveSupportChat />
    </>
  );
}
