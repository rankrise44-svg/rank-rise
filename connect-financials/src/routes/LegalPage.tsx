import { useSearchParams } from 'react-router-dom';
import { LegalTermsAndContactSection } from '../components/LegalTermsAndContactSection';
import { PageHeader } from '../components/ui/Layout';
import type { LegalTab } from '../config/site';
import { useUI } from '../state/UIProvider';

const VALID_TABS: LegalTab[] = ['terms', 'risk', 'execution', 'aml', 'privacy', 'deposits'];

export function LegalPage() {
  const { openAccountModal } = useUI();
  const [params] = useSearchParams();

  /* /legal?tab=aml opens straight on that policy, so the footer's individual
     policy links land where they say they will instead of dropping everyone on
     the terms tab. */
  const requested = params.get('tab') as LegalTab | null;
  const initialTab = requested && VALID_TABS.includes(requested) ? requested : 'terms';

  return (
    <>
      <PageHeader
        eyebrow="Legal"
        title="Terms, policies & contact"
        description="Account terms, client money handling, verification requirements and how to reach the compliance desk."
      />
      <LegalTermsAndContactSection
        onOpenAccount={() => openAccountModal('plus')}
        showHeading={false}
        initialTab={initialTab}
      />
    </>
  );
}
