import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  INITIAL_ACCOUNTS,
  INITIAL_INSTRUMENTS,
  INITIAL_KYC,
  INITIAL_TRANSACTIONS,
  generateInitialCandles,
} from '../data/forexData';
import type {
  Candle,
  ChartTimeframe,
  ClosedTrade,
  Instrument,
  KYCStatus,
  Position,
  TradingAccount,
  Transaction,
} from '../types';

/**
 * Shared trading state.
 *
 * This was all held in App.tsx, which worked while the site was a single
 * component tree. Now that the terminal, markets, tools and portal are separate
 * routes they need to share one simulated market, so it lives here.
 *
 * Note: every figure in this provider is SIMULATED. There is no market data
 * feed, no broker connection and no persistence.
 */

export interface TradeParams {
  symbol: string;
  type: 'BUY' | 'SELL';
  lots: number;
  price: number;
  stopLoss?: number;
  takeProfit?: number;
}

interface TradingContextValue {
  instruments: Instrument[];
  selectedInstrumentId: string;
  setSelectedInstrumentId: (id: string) => void;
  currentInstrument: Instrument;
  currentCandles: Candle[];
  flashingTicks: Record<string, 'up' | 'down'>;
  timeframe: ChartTimeframe;
  setTimeframe: (tf: ChartTimeframe) => void;

  accounts: TradingAccount[];
  activeAccount: TradingAccount;
  setActiveAccount: (acc: TradingAccount) => void;
  transactions: Transaction[];
  kyc: KYCStatus;
  openPositions: Position[];
  closedTrades: ClosedTrade[];

  executeTrade: (params: TradeParams) => void;
  closePosition: (positionId: string) => void;
  depositFunds: (amount: number, method: string) => void;
  withdrawFunds: (amount: number, method: string) => void;
  accountCreated: (account: TradingAccount) => void;
}

const TradingContext = createContext<TradingContextValue | null>(null);

const SEED_POSITIONS: Position[] = [
  {
    id: 'pos-101',
    accountId: 'acc-live-01',
    symbol: 'EUR/USD',
    type: 'BUY',
    lots: 1.0,
    openPrice: 1.0825,
    currentPrice: 1.0842,
    stopLoss: 1.08,
    takeProfit: 1.088,
    openTime: Date.now() - 3600000 * 2,
    profit: 170.0,
    pips: 17.0,
    commission: 0,
    swap: -2.4,
  },
  {
    id: 'pos-102',
    accountId: 'acc-live-01',
    symbol: 'XAU/USD',
    type: 'BUY',
    lots: 0.5,
    openPrice: 2638.0,
    currentPrice: 2642.5,
    stopLoss: 2625.0,
    takeProfit: 2660.0,
    openTime: Date.now() - 3600000 * 5,
    profit: 225.0,
    pips: 45.0,
    commission: 0,
    swap: -5.1,
  },
];

const SEED_CLOSED: ClosedTrade[] = [
  {
    id: 'pos-100',
    accountId: 'acc-live-01',
    symbol: 'GBP/USD',
    type: 'BUY',
    lots: 1.0,
    openPrice: 1.291,
    currentPrice: 1.2934,
    closePrice: 1.2934,
    openTime: Date.now() - 86400000,
    closeTime: Date.now() - 3600000 * 4,
    profit: 240.0,
    finalProfit: 240.0,
    pips: 24.0,
    commission: 0,
    swap: -1.2,
  },
];

const TICK_INTERVAL_MS = 1100;
const FLASH_DURATION_MS = 500;

function timestamp(): string {
  return new Date().toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
}

export function TradingProvider({ children }: { children: React.ReactNode }) {
  const [instruments, setInstruments] = useState<Instrument[]>(INITIAL_INSTRUMENTS);
  const [selectedInstrumentId, setSelectedInstrumentId] = useState<string>('EURUSD');
  const [flashingTicks, setFlashingTicks] = useState<Record<string, 'up' | 'down'>>({});
  const [timeframe, setTimeframe] = useState<ChartTimeframe>('M5');

  const [candlesMap, setCandlesMap] = useState<Record<string, Candle[]>>(() => {
    const map: Record<string, Candle[]> = {};
    INITIAL_INSTRUMENTS.forEach((inst) => {
      map[inst.id] = generateInitialCandles(inst.bid, 65, 5);
    });
    return map;
  });

  const [accounts, setAccounts] = useState<TradingAccount[]>(INITIAL_ACCOUNTS);
  const [activeAccount, setActiveAccount] = useState<TradingAccount>(INITIAL_ACCOUNTS[0]);
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [kyc] = useState<KYCStatus>(INITIAL_KYC);
  const [openPositions, setOpenPositions] = useState<Position[]>(SEED_POSITIONS);
  const [closedTrades, setClosedTrades] = useState<ClosedTrade[]>(SEED_CLOSED);

  const currentInstrument =
    instruments.find((i) => i.id === selectedInstrumentId) || instruments[0];
  const currentCandles = candlesMap[selectedInstrumentId] || [];

  /* -------------------------------------------------------------------------
     Tick engine.

     The original effect listed `instruments` as a dependency, so the interval
     was cleared and recreated on every single tick — roughly once a second, for
     the lifetime of the page — while the candle and P&L updates inside it read
     a snapshot of `instruments` captured before that tick was applied. Holding
     the live value in a ref lets the interval be created once and always read
     current prices.
     ------------------------------------------------------------------------- */
  const instrumentsRef = useRef(instruments);
  instrumentsRef.current = instruments;

  useEffect(() => {
    const flashTimers: ReturnType<typeof setTimeout>[] = [];

    const tick = setInterval(() => {
      const live = instrumentsRef.current;
      const count = Math.random() > 0.5 ? 2 : 1;

      const targetIndices: number[] = [];
      while (targetIndices.length < count && targetIndices.length < live.length) {
        const idx = Math.floor(Math.random() * live.length);
        if (!targetIndices.includes(idx)) targetIndices.push(idx);
      }

      const newTicks: Record<string, 'up' | 'down'> = {};
      const nextPrices: Record<string, number> = {};

      setInstruments((prev) =>
        prev.map((inst, index) => {
          if (!targetIndices.includes(index)) return inst;

          const isUp = Math.random() > 0.48;
          const jitterStep = inst.pipSize * (0.5 + Math.random() * 1.5);
          const delta = isUp ? jitterStep : -jitterStep;

          const newBid = +(inst.bid + delta).toFixed(inst.digits);
          const spreadPips = +(inst.spread + (Math.random() * 0.2 - 0.1)).toFixed(1);
          const newAsk = +(newBid + spreadPips * inst.pipSize).toFixed(inst.digits);

          newTicks[inst.id] = isUp ? 'up' : 'down';
          nextPrices[inst.id] = newBid;

          return {
            ...inst,
            bid: newBid,
            ask: newAsk,
            spread: Math.max(0.1, spreadPips),
            high24h: Math.max(inst.high24h, newBid),
            low24h: Math.min(inst.low24h, newBid),
          };
        }),
      );

      setFlashingTicks(newTicks);

      /* Roll the newly-ticked price into the live candle. */
      setCandlesMap((prev) => {
        const next = { ...prev };
        for (const [instrumentId, price] of Object.entries(nextPrices)) {
          const list = next[instrumentId];
          if (!list?.length) continue;

          const last = { ...list[list.length - 1] };
          last.close = price;
          if (price > last.high) last.high = price;
          if (price < last.low) last.low = price;
          last.volume += Math.floor(1 + Math.random() * 3);

          next[instrumentId] = [...list.slice(0, -1), last];
        }
        return next;
      });

      /* Mark open positions to market. */
      setOpenPositions((prev) =>
        prev.map((pos) => {
          const inst = instrumentsRef.current.find((i) => i.symbol === pos.symbol);
          if (!inst) return pos;

          const currentPrice = pos.type === 'BUY' ? inst.bid : inst.ask;
          const diff =
            pos.type === 'BUY' ? currentPrice - pos.openPrice : pos.openPrice - currentPrice;

          return {
            ...pos,
            currentPrice,
            pips: +(diff / inst.pipSize).toFixed(1),
            profit: +(diff * (pos.lots * inst.contractSize)).toFixed(2),
          };
        }),
      );

      /* Previously this timer was never cleared, so a page left open queued one
         orphaned timeout per tick. */
      flashTimers.push(setTimeout(() => setFlashingTicks({}), FLASH_DURATION_MS));
    }, TICK_INTERVAL_MS);

    return () => {
      clearInterval(tick);
      flashTimers.forEach(clearTimeout);
    };
  }, []);

  /* ------------------------------------------------------------------------- */

  const executeTrade = useCallback(
    (params: TradeParams) => {
      const inst = instrumentsRef.current.find((i) => i.symbol === params.symbol);
      const contractSize = inst ? inst.contractSize : 100000;

      const leverageNum = parseInt(activeAccount.leverage.replace('1:', ''), 10) || 100;
      const requiredMargin = (params.lots * contractSize * params.price) / leverageNum;

      const position: Position = {
        id: `pos-${Date.now()}`,
        accountId: activeAccount.id,
        symbol: params.symbol,
        type: params.type,
        lots: params.lots,
        openPrice: params.price,
        currentPrice: params.price,
        stopLoss: params.stopLoss,
        takeProfit: params.takeProfit,
        openTime: Date.now(),
        profit: 0,
        pips: 0,
        commission: activeAccount.type === 'Raw' ? params.lots * 7 : 0,
        swap: 0,
      };

      setOpenPositions((prev) => [position, ...prev]);
      setActiveAccount((prev) => ({
        ...prev,
        margin: +(prev.margin + requiredMargin).toFixed(2),
        freeMargin: +(prev.balance - (prev.margin + requiredMargin)).toFixed(2),
      }));
    },
    [activeAccount],
  );

  const closePosition = useCallback((positionId: string) => {
    setOpenPositions((prevPositions) => {
      const pos = prevPositions.find((p) => p.id === positionId);
      if (!pos) return prevPositions;

      setClosedTrades((prev) => [
        { ...pos, closePrice: pos.currentPrice, closeTime: Date.now(), finalProfit: pos.profit },
        ...prev,
      ]);

      setActiveAccount((prev) => {
        const balance = +(prev.balance + pos.profit).toFixed(2);
        const margin = Math.max(0, +(prev.margin - pos.lots * 1000).toFixed(2));
        return {
          ...prev,
          balance,
          equity: balance,
          margin,
          freeMargin: +(balance - margin).toFixed(2),
        };
      });

      setTransactions((prev) => [
        {
          id: `tx-${Date.now()}`,
          accountId: pos.accountId,
          type: 'Trade Profit',
          method: `${pos.symbol} ${pos.type} Closed`,
          amount: pos.profit,
          status: 'Completed',
          date: timestamp(),
        },
        ...prev,
      ]);

      return prevPositions.filter((p) => p.id !== positionId);
    });
  }, []);

  const depositFunds = useCallback(
    (amount: number, method: string) => {
      setActiveAccount((prev) => ({
        ...prev,
        balance: +(prev.balance + amount).toFixed(2),
        equity: +(prev.equity + amount).toFixed(2),
        freeMargin: +(prev.freeMargin + amount).toFixed(2),
      }));

      setAccounts((prev) =>
        prev.map((acc) =>
          acc.id === activeAccount.id
            ? {
                ...acc,
                balance: +(acc.balance + amount).toFixed(2),
                equity: +(acc.equity + amount).toFixed(2),
              }
            : acc,
        ),
      );

      setTransactions((prev) => [
        {
          id: `tx-${Date.now()}`,
          accountId: activeAccount.id,
          type: 'Deposit',
          method,
          amount,
          status: 'Completed',
          date: timestamp(),
        },
        ...prev,
      ]);
    },
    [activeAccount.id],
  );

  const withdrawFunds = useCallback(
    (amount: number, method: string) => {
      setActiveAccount((prev) => ({
        ...prev,
        balance: +(prev.balance - amount).toFixed(2),
        equity: +(prev.equity - amount).toFixed(2),
        freeMargin: +(prev.freeMargin - amount).toFixed(2),
      }));

      setTransactions((prev) => [
        {
          id: `tx-${Date.now()}`,
          accountId: activeAccount.id,
          type: 'Withdrawal',
          method,
          amount: -amount,
          status: 'Processing',
          date: timestamp(),
        },
        ...prev,
      ]);
    },
    [activeAccount.id],
  );

  const accountCreated = useCallback((account: TradingAccount) => {
    setAccounts((prev) => [account, ...prev]);
    setActiveAccount(account);
  }, []);

  const value = useMemo<TradingContextValue>(
    () => ({
      instruments,
      selectedInstrumentId,
      setSelectedInstrumentId,
      currentInstrument,
      currentCandles,
      flashingTicks,
      timeframe,
      setTimeframe,
      accounts,
      activeAccount,
      setActiveAccount,
      transactions,
      kyc,
      openPositions,
      closedTrades,
      executeTrade,
      closePosition,
      depositFunds,
      withdrawFunds,
      accountCreated,
    }),
    [
      instruments,
      selectedInstrumentId,
      currentInstrument,
      currentCandles,
      flashingTicks,
      timeframe,
      accounts,
      activeAccount,
      transactions,
      kyc,
      openPositions,
      closedTrades,
      executeTrade,
      closePosition,
      depositFunds,
      withdrawFunds,
      accountCreated,
    ],
  );

  return <TradingContext.Provider value={value}>{children}</TradingContext.Provider>;
}

export function useTrading(): TradingContextValue {
  const ctx = useContext(TradingContext);
  if (!ctx) throw new Error('useTrading must be used within a <TradingProvider>');
  return ctx;
}
