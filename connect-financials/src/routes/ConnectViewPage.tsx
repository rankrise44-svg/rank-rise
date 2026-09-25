import { Maximize2 } from 'lucide-react';
import { ConnectViewStudio } from '../components/ConnectViewStudio';
import { Button } from '../components/ui/Button';
import { Container, PageHeader } from '../components/ui/Layout';
import { useTrading } from '../state/TradingProvider';
import { useUI } from '../state/UIProvider';

/**
 * ConnectView — the chart analysis studio.
 *
 * It used to sit below the terminal on the platform page, which made two
 * full charting surfaces compete on one screen and buried the analysis tools
 * under a scroll. It gets its own route and its own place in the header.
 */
export function ConnectViewPage() {
  const { instruments, selectedInstrumentId, executeTrade } = useTrading();
  const { openStudio } = useUI();

  return (
    <>
      <PageHeader
        wide
        eyebrow="ConnectView"
        title="Chart analysis studio"
        description="Mark up structure and levels: support and resistance, Elliott wave counts, order blocks, Fibonacci retracements, break of structure and volume profile."
        actions={
          <Button variant="secondary" size="sm" onClick={() => openStudio(selectedInstrumentId)}>
            <Maximize2 className="h-4 w-4" aria-hidden="true" />
            Fullscreen
          </Button>
        }
      />

      <Container wide>
        {/* Tall by default: analysis needs vertical room, and this is the only
            thing on the page competing for it. */}
        <div className="my-8 h-[640px] overflow-hidden rounded-[var(--radius-lg)] border border-line sm:h-[760px]">
          <ConnectViewStudio
            instruments={instruments}
            initialSymbol={selectedInstrumentId}
            onExecuteTrade={executeTrade}
          />
        </div>
      </Container>
    </>
  );
}
