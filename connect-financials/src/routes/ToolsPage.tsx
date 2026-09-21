import { useNavigate } from 'react-router-dom';
import { ForexCalculators } from '../components/ForexCalculators';
import { EconomicCalendar } from '../components/EconomicCalendar';
import { PageHeader } from '../components/ui/Layout';
import { ROUTES } from '../config/site';
import { useTrading } from '../state/TradingProvider';

export function ToolsPage() {
  const navigate = useNavigate();
  const { instruments, activeAccount, setSelectedInstrumentId, executeTrade } = useTrading();

  return (
    <>
      <PageHeader
        eyebrow="Tools"
        title="Calculators & calendar"
        description="Size a position against a fixed risk budget, check margin before committing capital, and see which releases are due before you hold through them."
      />

      <ForexCalculators
        showHeading={false}
        instruments={instruments}
        activeAccountBalance={activeAccount.balance}
        onApplyTrade={(tradeParams) => {
          const inst = instruments.find(
            (i) => i.symbol === tradeParams.symbol || i.id === tradeParams.symbol,
          );
          if (inst) setSelectedInstrumentId(inst.id);
          executeTrade(tradeParams);
          navigate(ROUTES.platform);
        }}
      />

      <EconomicCalendar showHeading={false} />
    </>
  );
}
