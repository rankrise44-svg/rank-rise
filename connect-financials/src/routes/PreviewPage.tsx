import { AnimatedHeroVisual } from '../components/AnimatedHeroVisual';
import { Header as LegacyHeader } from '../components/Header';
import { Footer as LegacyFooter } from '../components/Footer';
import { Container, PageHeader, Section, SectionHeading } from '../components/ui/Layout';
import { useTrading } from '../state/TradingProvider';
import { useUI } from '../state/UIProvider';

/**
 * Preview of the components the route split left unused.
 *
 * Not linked from the navigation — it exists so the three superseded pieces can
 * be looked at side by side and kept, replaced or dropped deliberately rather
 * than by omission. Delete this route once that decision is made.
 */
export function PreviewPage() {
  const { activeAccount } = useTrading();
  const { openAccountModal, openStudio } = useUI();

  return (
    <>
      <PageHeader
        eyebrow="Internal"
        title="Unused components"
        description="Three pieces superseded by the rebuild. Nothing here is linked from the live navigation."
      />

      <Section spacing="sm">
        <Container>
          <SectionHeading
            eyebrow="1 of 3"
            title="AnimatedHeroVisual"
            description="The alternative hero panel, built around the animated WebP rather than the eagle-eye photograph. Currently replaced by EagleEyeMotionVisual in the hero."
          />
          <div className="mt-8 max-w-2xl">
            <AnimatedHeroVisual />
          </div>
        </Container>
      </Section>

      <Section spacing="sm">
        <Container>
          <SectionHeading
            eyebrow="2 of 3"
            title="Header (original)"
            description="The 39 KB header: ticker row, utility strip and five dropdowns. Superseded by SiteHeader, whose menu now carries the same destinations."
          />
        </Container>
        <div className="mt-8 border-y border-line">
          <LegacyHeader
            currentView="website"
            setCurrentView={() => {}}
            onOpenAccountModal={(tier) => openAccountModal(tier ?? 'plus')}
            activeAccount={activeAccount}
            onNavigateSection={() => {}}
            onOpenConnectView={() => openStudio()}
          />
        </div>
      </Section>

      <Section spacing="sm" bordered={false}>
        <Container>
          <SectionHeading
            eyebrow="3 of 3"
            title="Footer (original)"
            description="Superseded by SiteFooter. Its link set has been folded into config/site.ts; the regulatory text it hard-coded now lives in config/compliance.ts."
          />
        </Container>
        <div className="mt-8 border-t border-line">
          <LegacyFooter />
        </div>
      </Section>
    </>
  );
}
