import { Maximize2 } from 'lucide-react';
import { MarketChartTerminal } from '../components/MarketChartTerminal';
import { MarketDepthOrderBook } from '../components/MarketDepthOrderBook';
import { ConnectViewStudio } from '../components/ConnectViewStudio';
import { Button } from '../components/ui/Button';
import { Container, PageHeader, Section, SectionHeading } from '../components/ui/Layout';
import { useTrading } from '../state/TradingProvider';
import { useUI } from '../state/UIProvider';

export function PlatformPage() {
  const {
    instruments,
    currentInstrument,
    currentCandles,
    timeframe,
    setTimeframe,
    selectedInstrumentId,
    executeTrade,
  } = useTrading();
  const { openStudio } = useUI();

  return (
    <>
      <PageHeader
        wide
        eyebrow="Platform"
        title="Trading terminal"
        description="Charting, Level II depth and order entry on one screen. Prices and fills shown here are simulated."
      />

      {/* Terminal + depth */}
      <Section spacing="sm">
        <Container wide>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
            <div className="lg:col-span-8">
              <MarketChartTerminal
                instrument={currentInstrument}
                candles={currentCandles}
                timeframe={timeframe}
                setTimeframe={setTimeframe}
                onExecuteTrade={executeTrade}
              />
            </div>

            {/* On mobile the order book is given a fixed, scrollable height
                rather than being allowed to run to several screens. */}
            <div className="h-[420px] sm:h-[540px] lg:col-span-4 lg:h-[600px]">
              <MarketDepthOrderBook instrument={currentInstrument} />
            </div>
          </div>
        </Container>
      </Section>

      {/* Analysis studio */}
      <Section spacing="sm" bordered={false}>
        <Container wide>
          <SectionHeading
            eyebrow="ConnectView"
            title="Chart studio"
            description="Support and resistance, Elliott wave counts, order blocks, Fibonacci retracements, market structure and volume profile."
            actions={
              <Button variant="secondary" size="sm" onClick={() => openStudio(selectedInstrumentId)}>
                <Maximize2 className="h-4 w-4" aria-hidden="true" />
                Fullscreen
              </Button>
            }
          />

          <div className="mt-8 h-[520px] overflow-hidden rounded-[var(--radius-lg)] border border-line sm:h-[620px]">
            <ConnectViewStudio
              instruments={instruments}
              initialSymbol={selectedInstrumentId}
              onExecuteTrade={executeTrade}
            />
          </div>
        </Container>
      </Section>
    </>
  );
}
