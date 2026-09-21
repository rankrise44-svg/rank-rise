import { useNavigate } from 'react-router-dom';
import { AboutUsSection } from '../components/AboutUsSection';
import { PageHeader } from '../components/ui/Layout';
import { ROUTES } from '../config/site';
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
      <AboutUsSection
        showHeading={false}
        onOpenAccount={() => openAccountModal('plus')}
        onExploreMarkets={() => navigate(ROUTES.markets)}
      />
    </>
  );
}
