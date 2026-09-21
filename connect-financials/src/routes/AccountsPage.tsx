import { TradingAccountsSection } from '../components/TradingAccountsSection';
import { PageHeader } from '../components/ui/Layout';
import { useUI } from '../state/UIProvider';

export function AccountsPage() {
  const { openAccountModal } = useUI();

  return (
    <>
      <PageHeader
        eyebrow="Accounts"
        title="Account types"
        description="Compare spreads, commission and minimum deposit. Every account runs on the same liquidity and the same terminal — the difference is how the cost is charged."
      />
      <TradingAccountsSection onOpenAccount={openAccountModal} showHeading={false} />
    </>
  );
}
