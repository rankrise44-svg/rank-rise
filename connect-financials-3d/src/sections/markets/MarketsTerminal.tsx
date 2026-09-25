import { useState } from 'react';
import { MarketWatch } from './MarketWatch';
import { ChartTerminal } from './ChartTerminal';
import { OrderBook } from './OrderBook';

/**
 * Market watch | chart + depth. Desktop: watch list left (~40%), chart top-right,
 * depth ladder beneath it. Tablet/phone: stacked.
 */
export function MarketsTerminal() {
  const [selected, setSelected] = useState('EURUSD');

  return (
    <div className="grid w-full min-w-0 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-5">
      {/* On desktop the watch list fills the full column height without driving it. */}
      <div className="glass relative min-w-0 overflow-hidden rounded-2xl lg:row-span-2 lg:min-h-[560px]">
        <div className="h-full lg:absolute lg:inset-0">
          <MarketWatch selected={selected} onSelect={setSelected} />
        </div>
      </div>
      <div className="glass min-w-0 overflow-hidden rounded-2xl">
        <ChartTerminal instrumentId={selected} />
      </div>
      <div className="glass min-w-0 overflow-hidden rounded-2xl">
        <OrderBook instrumentId={selected} />
      </div>
    </div>
  );
}
