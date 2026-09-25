export type InstrumentCategory = 'forex_majors' | 'forex_minors' | 'metals' | 'indices' | 'crypto' | 'energies';

export interface Instrument {
  id: string;
  symbol: string;
  name: string;
  category: InstrumentCategory;
  bid: number;
  ask: number;
  spread: number; // in pips or points
  digits: number;
  pipSize: number;
  change24h: number;
  high24h: number;
  low24h: number;
  baseCurrency: string;
  quoteCurrency: string;
  contractSize: number; // e.g. 100,000 for standard forex lot
  dayVolume: string;
}

export interface Candle {
  time: number; // timestamp
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type ChartTimeframe = 'M1' | 'M5' | 'M15' | 'H1' | 'H4' | 'D1';
export type ChartType = 'candlestick' | 'line' | 'mountain';

export interface IndicatorConfig {
  ma20: boolean;
  ma50: boolean;
  bollinger: boolean;
  rsi: boolean;
  volume: boolean;
}

export interface OrderBookLevel {
  price: number;
  size: number;
  total: number;
}

export interface OrderBookData {
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
}

export interface Position {
  id: string;
  accountId: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  lots: number;
  openPrice: number;
  currentPrice: number;
  stopLoss?: number;
  takeProfit?: number;
  openTime: number;
  profit: number; // in USD
  pips: number;
  commission: number;
  swap: number;
}

export interface ClosedTrade extends Position {
  closePrice: number;
  closeTime: number;
  finalProfit: number;
}

export interface TradingAccount {
  id: string;
  accountNumber: string;
  type: 'Standard' | 'Raw' | 'Plus' | 'Demo' | 'Islamic';
  isLive: boolean;
  currency: string;
  balance: number;
  equity: number;
  margin: number;
  freeMargin: number;
  marginLevel: number;
  leverage: string; // e.g. "1:100"
  server: string;
  createdDate: string;
}

export interface Transaction {
  id: string;
  accountId: string;
  type: 'Deposit' | 'Withdrawal' | 'Transfer' | 'Trade Profit' | 'Commission';
  method?: string;
  amount: number;
  status: 'Completed' | 'Pending' | 'Processing';
  date: string;
  txHash?: string;
}

export interface EconomicEvent {
  id: string;
  time: string;
  currency: string;
  countryCode: string;
  event: string;
  impact: 'high' | 'medium' | 'low';
  actual?: string;
  forecast: string;
  previous: string;
}

export interface KYCStatus {
  tier1Identity: 'Verified' | 'Pending' | 'Not Submitted';
  tier2Address: 'Verified' | 'Pending' | 'Not Submitted';
  twoFactorEnabled: boolean;
  phoneVerified: boolean;
  fullName: string;
  email: string;
  nationality: string;
  phone: string;
}

export type ActivePortalView = 'overview' | 'trade' | 'positions' | 'funds' | 'kyc' | 'history';
