import { useNavigate } from 'react-router-dom';
import { TraderPortal } from '../components/TraderPortal';
import { ROUTES } from '../config/site';
import { useTrading } from '../state/TradingProvider';

export function PortalPage() {
  const navigate = useNavigate();
  const {
    activeAccount,
    accounts,
    setActiveAccount,
    openPositions,
    closedTrades,
    transactions,
    kyc,
    closePosition,
    depositFunds,
    withdrawFunds,
  } = useTrading();

  return (
    <TraderPortal
      activeAccount={activeAccount}
      accounts={accounts}
      onSwitchAccount={setActiveAccount}
      openPositions={openPositions}
      closedTrades={closedTrades}
      transactions={transactions}
      kyc={kyc}
      onClosePosition={closePosition}
      onDepositFunds={depositFunds}
      onWithdrawFunds={withdrawFunds}
      onSwitchToTerminal={() => navigate(ROUTES.platform)}
    />
  );
}
