import { MarketChartTerminal } from '../components/MarketChartTerminal';
import { MarketDepthOrderBook } from '../components/MarketDepthOrderBook';
import { Container, PageHeader, Section } from '../components/ui/Layout';
import { useTrading } from '../state/TradingProvider';

export function PlatformPage() {
  const {
    currentInstrument,
    currentCandles,
    timeframe,
    setTimeframe,
    executeTrade,
  } = useTrading();

  return (
    <>
      <PageHeader
        wide
        eyebrow="Platform"
        title="Trading terminal"
        description="Charting, Level II depth and order entry on one screen. Prices and fills shown here are simulated."
      />

      {/* The ConnectView studio moved to its own route: two full charting
          surfaces on one page competed with each other, and the analysis tools
          were buried under a scroll. */}

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

    </>
  );
}
