import { useNavigate } from 'react-router-dom';
import { AboutUsSection } from '../components/AboutUsSection';
import { GoldenEagle3D } from '../components/GoldenEagle3D';
import { Container, PageHeader, Section } from '../components/ui/Layout';
import { Eyebrow } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { ROUTES, brand } from '../config/site';
import { useUI } from '../state/UIProvider';

export function AboutPage() {
  const navigate = useNavigate();
  const { openAccountModal } = useUI();

  return (
    <>
      <PageHeader
        eyebrow="Company"
        title="About Connect Financials"
        description="How the firm is structured, how client capital is handled, and who we build for."
      />

      {/* The rotating 3D eagle. It had no home after the single-page layout was
          split, and the company page is where the brand mark belongs. */}
      <Section spacing="md">
        <Container>
          <div className="grid items-center gap-12 lg:grid-cols-[1fr_1fr] lg:gap-16">
            <div>
              <Eyebrow>The mark</Eyebrow>
              <h2 className="mt-4 text-h2 font-bold text-text">
                The eagle is the point of the whole thing
              </h2>
              <p className="mt-5 text-body text-text-muted">
                {brand.name} is built on one idea: see the move before it happens, then act on it
                faster than the market can close the gap. Aggregated Tier-1 liquidity, sub-10ms
                execution out of Equinix NY4, and the risk tooling to size the position properly
                before it is ever placed.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button variant="primary" onClick={() => openAccountModal('plus')}>
                  Open an account
                </Button>
                <Button variant="secondary" onClick={() => navigate(ROUTES.platform)}>
                  See the terminal
                </Button>
              </div>
            </div>

            <div className="flex justify-center">
              <GoldenEagle3D size="lg" />
            </div>
          </div>
        </Container>
      </Section>

      <AboutUsSection
        showHeading={false}
        onOpenAccount={() => openAccountModal('plus')}
        onExploreMarkets={() => navigate(ROUTES.markets)}
      />
    </>
  );
}
