import { useNavigate } from 'react-router-dom';
import { CurrenciesSection } from '../components/CurrenciesSection';
import { MarketWatchTable } from '../components/MarketWatchTable';
import { Container, PageHeader, Section } from '../components/ui/Layout';
import { ROUTES } from '../config/site';
import { useTrading } from '../state/TradingProvider';
import { useUI } from '../state/UIProvider';

export function MarketsPage() {
  const navigate = useNavigate();
  const { instruments, selectedInstrumentId, setSelectedInstrumentId, executeTrade } = useTrading();
  const { openStudio } = useUI();

  /* Selecting an instrument used to scroll to the terminal on the same page;
     it now selects and navigates, so the terminal opens on the chosen pair. */
  const selectAndOpenTerminal = (id: string) => {
    setSelectedInstrumentId(id);
    navigate(ROUTES.platform);
  };

  return (
    <>
      <PageHeader
        wide
        eyebrow="Markets"
        title="Tradable instruments"
        description="Major, minor and exotic currency pairs alongside spot metals, with raw spreads and direct STP execution."
      />

      <CurrenciesSection
        showHeading={false}
        instruments={instruments}
        onSelectInstrument={selectAndOpenTerminal}
        onTrade={(inst, type) => {
          setSelectedInstrumentId(inst.id);
          executeTrade({
            symbol: inst.symbol,
            type,
            lots: 0.1,
            price: type === 'BUY' ? inst.ask : inst.bid,
          });
          navigate(ROUTES.platform);
        }}
        onOpenConnectView={(symbol) => {
          if (symbol) {
            const found = instruments.find((i) => i.symbol === symbol || i.id === symbol);
            if (found) setSelectedInstrumentId(found.id);
          }
          openStudio(symbol);
        }}
      />

      <Section spacing="sm" bordered={false}>
        <Container wide>
          <MarketWatchTable
            instruments={instruments}
            selectedInstrumentId={selectedInstrumentId}
            onSelectInstrument={selectAndOpenTerminal}
            onQuickTrade={(inst, type) => {
              setSelectedInstrumentId(inst.id);
              executeTrade({
                symbol: inst.symbol,
                type,
                lots: 0.1,
                price: type === 'BUY' ? inst.ask : inst.bid,
              });
            }}
          />
        </Container>
      </Section>
    </>
  );
}
