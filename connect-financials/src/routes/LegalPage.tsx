import { LegalTermsAndContactSection } from '../components/LegalTermsAndContactSection';
import { PageHeader } from '../components/ui/Layout';
import { useUI } from '../state/UIProvider';

export function LegalPage() {
  const { openAccountModal } = useUI();

  return (
    <>
      <PageHeader
        eyebrow="Legal"
        title="Terms, policies & contact"
        description="Account terms, client money handling, verification requirements and how to reach the compliance desk."
      />
      <LegalTermsAndContactSection onOpenAccount={() => openAccountModal('plus')} showHeading={false} />
    </>
  );
}
