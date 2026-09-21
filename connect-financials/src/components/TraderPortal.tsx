import React, { useState } from 'react';
import {
  Lock,
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  Layers,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  FileText,
  Download,
  CreditCard,
  QrCode,
  DollarSign,
  TrendingUp,
  TrendingDown,
  X,
  ExternalLink,
  ChevronRight,
  Clock,
  UserCheck
} from 'lucide-react';
import { TradingAccount, Position, ClosedTrade, Transaction, KYCStatus, ActivePortalView, Instrument } from '../types';

interface Props {
  activeAccount: TradingAccount;
  accounts: TradingAccount[];
  onSwitchAccount: (account: TradingAccount) => void;
  openPositions: Position[];
  closedTrades: ClosedTrade[];
  transactions: Transaction[];
  kyc: KYCStatus;
  onClosePosition: (positionId: string) => void;
  onDepositFunds: (amount: number, method: string) => void;
  onWithdrawFunds: (amount: number, method: string) => void;
  onSwitchToTerminal: () => void;
}

export const TraderPortal: React.FC<Props> = ({
  activeAccount,
  accounts,
  onSwitchAccount,
  openPositions,
  closedTrades,
  transactions,
  kyc,
  onClosePosition,
  onDepositFunds,
  onWithdrawFunds,
  onSwitchToTerminal
}) => {
  const [activeTab, setActiveTab] = useState<ActivePortalView>('overview');

  // Deposit Modal/Form State
  const [depositAmount, setDepositAmount] = useState('1000');
  const [depositMethod, setDepositMethod] = useState('USDT (TRC20)');
  const [depositSuccessMsg, setDepositSuccessMsg] = useState<string | null>(null);

  // Withdraw Modal/Form State
  const [withdrawAmount, setWithdrawAmount] = useState('500');
  const [withdrawMethod, setWithdrawMethod] = useState('USDT (TRC20)');
  const [withdrawSuccessMsg, setWithdrawSuccessMsg] = useState<string | null>(null);

  // KYC upload mock state
  const [kycUploading, setKycUploading] = useState(false);
  const [kycSuccessMsg, setKycSuccessMsg] = useState<string | null>(null);

  // Total Floating P&L from open positions
  const totalFloatingPnl = openPositions.reduce((acc, pos) => acc + pos.profit, 0);
  const liveEquity = activeAccount.balance + totalFloatingPnl;
  const freeMargin = liveEquity - activeAccount.margin;
  const marginLevel = activeAccount.margin > 0 ? (liveEquity / activeAccount.margin) * 100 : 0;

  const handleDepositSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(depositAmount);
    if (!amount || amount <= 0) return;

    onDepositFunds(amount, depositMethod);
    setDepositSuccessMsg(`Successfully credited $${amount.toLocaleString()} USD via ${depositMethod}!`);
    setTimeout(() => setDepositSuccessMsg(null), 4000);
  };

  const handleWithdrawSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount <= 0) return;
    if (amount > freeMargin) {
      alert('Withdrawal amount exceeds available free margin!');
      return;
    }

    onWithdrawFunds(amount, withdrawMethod);
    setWithdrawSuccessMsg(`Withdrawal request of $${amount.toLocaleString()} USD submitted for compliance clearance.`);
    setTimeout(() => setWithdrawSuccessMsg(null), 4000);
  };

  const handleKycUpload = () => {
    setKycUploading(true);
    setTimeout(() => {
      setKycUploading(false);
      setKycSuccessMsg('Verification documents uploaded & encrypted with 256-bit AES. Status: Approved.');
      setTimeout(() => setKycSuccessMsg(null), 4500);
    }, 1200);
  };

  return (
    <div id="trader-portal-root" className="min-h-[85vh] bg-slate-950 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Portal Banner */}
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-2xl">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-800">
            {/* Account Info & Switcher */}
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <Lock className="w-6 h-6" />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-extrabold text-white">Client Portal</h1>
                  <span
                    className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded font-bold ${
                      activeAccount.isLive
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}
                  >
                    {activeAccount.isLive ? 'Live Real-Money' : 'Demo Virtual'}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mt-1 font-mono">
                  <span className="text-white font-bold">{activeAccount.type} Account</span>
                  <span>•</span>
                  <span>ID: {activeAccount.accountNumber}</span>
                  <span>•</span>
                  <span>Leverage: {activeAccount.leverage}</span>
                  <span>•</span>
                  <span className="text-emerald-400 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> 256-bit SSL Secure
                  </span>
                </div>
              </div>
            </div>

            {/* Account Switcher dropdown & quick deposit */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-medium">Switch Account:</span>
                <select
                  value={activeAccount.id}
                  onChange={(e) => {
                    const found = accounts.find((a) => a.id === e.target.value);
                    if (found) onSwitchAccount(found);
                  }}
                  className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:border-cyan-500 focus:outline-none"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.type} ({acc.accountNumber}) - ${acc.balance.toLocaleString()}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => setActiveTab('funds')}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 font-bold text-xs shadow-md shadow-cyan-500/20 flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowDownLeft className="w-4 h-4" />
                <span>Deposit Funds</span>
              </button>
            </div>
          </div>

          {/* Core Financial Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-6 font-mono">
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/80">
              <div className="text-[11px] text-slate-400 uppercase tracking-wider font-sans">Balance</div>
              <div className="text-lg font-bold text-white mt-1">
                ${activeAccount.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/80">
              <div className="text-[11px] text-slate-400 uppercase tracking-wider font-sans">Equity</div>
              <div className="text-lg font-bold text-cyan-400 mt-1">
                ${liveEquity.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/80">
              <div className="text-[11px] text-slate-400 uppercase tracking-wider font-sans">Open P&L</div>
              <div
                className={`text-lg font-bold mt-1 ${
                  totalFloatingPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {totalFloatingPnl >= 0 ? '+' : ''}${totalFloatingPnl.toFixed(2)}
              </div>
            </div>

            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/80">
              <div className="text-[11px] text-slate-400 uppercase tracking-wider font-sans">Margin Used</div>
              <div className="text-lg font-bold text-slate-300 mt-1">
                ${activeAccount.margin.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/80">
              <div className="text-[11px] text-slate-400 uppercase tracking-wider font-sans">Free Margin</div>
              <div className="text-lg font-bold text-white mt-1">
                ${freeMargin.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/80">
              <div className="text-[11px] text-slate-400 uppercase tracking-wider font-sans">Margin Level</div>
              <div className="text-lg font-bold text-emerald-400 mt-1">
                {marginLevel > 0 ? `${marginLevel.toFixed(1)}%` : '∞'}
              </div>
            </div>
          </div>
        </div>

        {/* Portal Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs font-semibold">
          {[
            { id: 'overview', label: 'Dashboard Overview', icon: Layers },
            { id: 'positions', label: `Active Trades (${openPositions.length})`, icon: TrendingUp },
            { id: 'funds', label: 'Deposit & Withdraw', icon: Wallet },
            { id: 'kyc', label: 'KYC & Verification', icon: UserCheck },
            { id: 'history', label: 'Transaction History', icon: FileText }
          ].map((tab) => {
            const Icon = tab.icon;
            const isCurrent = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`portal-tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id as ActivePortalView)}
                className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  isCurrent
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Quick Actions & Live Open Positions */}
            <div className="lg:col-span-8 space-y-6">
              <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-xl">
                <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-cyan-400" />
                    <h3 className="font-bold text-white text-base">Open Positions</h3>
                  </div>
                  <button
                    onClick={onSwitchToTerminal}
                    className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <span>Launch WebTrader</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>

                {openPositions.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs">
                    <p>No open positions right now.</p>
                    <button
                      onClick={onSwitchToTerminal}
                      className="mt-3 px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 font-bold"
                    >
                      Place Trade on Terminal
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto pt-2">
                    <table className="w-full text-left text-xs font-mono">
                      <thead>
                        <tr className="text-slate-400 uppercase text-[10px] border-b border-slate-800">
                          <th className="py-2.5 px-2">Symbol</th>
                          <th className="py-2.5 px-2">Type</th>
                          <th className="py-2.5 px-2">Lots</th>
                          <th className="py-2.5 px-2">Open Price</th>
                          <th className="py-2.5 px-2">Current</th>
                          <th className="py-2.5 px-2">SL / TP</th>
                          <th className="py-2.5 px-2">Profit (USD)</th>
                          <th className="py-2.5 px-2 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50">
                        {openPositions.map((pos) => (
                          <tr key={pos.id} className="hover:bg-slate-800/40">
                            <td className="py-3 px-2 font-bold text-white">{pos.symbol}</td>
                            <td className="py-3 px-2">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  pos.type === 'BUY'
                                    ? 'bg-emerald-500/20 text-emerald-300'
                                    : 'bg-rose-500/20 text-rose-300'
                                }`}
                              >
                                {pos.type}
                              </span>
                            </td>
                            <td className="py-3 px-2 text-slate-200">{pos.lots}</td>
                            <td className="py-3 px-2 text-slate-200">{pos.openPrice.toFixed(4)}</td>
                            <td className="py-3 px-2 text-cyan-300">{pos.currentPrice.toFixed(4)}</td>
                            <td className="py-3 px-2 text-slate-400 text-[11px]">
                              {pos.stopLoss ? pos.stopLoss.toFixed(4) : '-'}/{pos.takeProfit ? pos.takeProfit.toFixed(4) : '-'}
                            </td>
                            <td
                              className={`py-3 px-2 font-bold ${
                                pos.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                              }`}
                            >
                              {pos.profit >= 0 ? '+' : ''}${pos.profit.toFixed(2)}
                            </td>
                            <td className="py-3 px-2 text-right">
                              <button
                                onClick={() => onClosePosition(pos.id)}
                                className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-[11px] font-sans font-semibold cursor-pointer"
                              >
                                Close
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Performance & Execution Health */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                  <div className="text-xs text-slate-400">Account Health</div>
                  <div className="text-base font-bold text-emerald-400 mt-1 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4" /> Normal / Healthy
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">Margin call trigger at 50%</div>
                </div>

                <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                  <div className="text-xs text-slate-400">Server Latency</div>
                  <div className="text-base font-bold text-cyan-400 mt-1 font-mono">8.4 ms (Equinix NY4)</div>
                  <div className="text-[11px] text-slate-500 mt-1">Direct Fiber Interconnect</div>
                </div>

                <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                  <div className="text-xs text-slate-400">KYC Status</div>
                  <div className="text-base font-bold text-emerald-400 mt-1 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> Fully Verified
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">Unrestricted withdrawal limits</div>
                </div>
              </div>
            </div>

            {/* Right: Quick Deposit & Support Card */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 shadow-xl">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
                  <Wallet className="w-4 h-4 text-cyan-400" />
                  <h3 className="font-bold text-sm text-white">Instant Funds Gateway</h3>
                </div>

                <form onSubmit={handleDepositSubmit} className="space-y-3 pt-3">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Deposit Method</label>
                    <select
                      value={depositMethod}
                      onChange={(e) => setDepositMethod(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-xs text-white"
                    >
                      <option value="USDT (TRC20)">USDT (TRC20 Network - Zero Fee)</option>
                      <option value="Bank Wire Transfer">Bank Wire Transfer (SWIFT)</option>
                      <option value="Visa / Mastercard">Visa / Mastercard Instant</option>
                      <option value="Skrill / Neteller">Skrill / Neteller E-Wallet</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Amount (USD)</label>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono">$</span>
                        <input
                          type="number"
                          value={depositAmount}
                          onChange={(e) => setDepositAmount(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-7 pr-3 py-2 text-xs text-white font-mono font-bold focus:border-cyan-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    {['500', '1000', '2500', '5000'].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setDepositAmount(preset)}
                        className="flex-1 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-mono"
                      >
                        +${preset}
                      </button>
                    ))}
                  </div>

                  {depositSuccessMsg && (
                    <div className="p-2.5 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>{depositSuccessMsg}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl font-bold text-xs text-slate-950 bg-gradient-to-r from-cyan-400 to-blue-400 hover:from-cyan-300 hover:to-blue-300 shadow-md transition-all cursor-pointer mt-2"
                  >
                    Confirm Deposit into {activeAccount.accountNumber}
                  </button>
                </form>
              </div>

              {/* Account Manager VIP Card */}
              <div className="bg-gradient-to-br from-slate-900 to-slate-950 rounded-2xl border border-slate-800 p-5">
                <div className="text-xs text-cyan-400 font-semibold uppercase tracking-wider">
                  Dedicated Account Representative
                </div>
                <h4 className="text-base font-bold text-white mt-1">Marcus Vance</h4>
                <p className="text-xs text-slate-400">Institutional FX Desk • London Equinix LD4</p>
                <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Direct Desk:</span>
                  <span className="text-white font-mono">+44 20 7946 0912</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ACTIVE POSITIONS & ORDERS */}
        {activeTab === 'positions' && (
          <div className="space-y-6">
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-xl">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div>
                  <h3 className="text-lg font-bold text-white">Live Open Positions</h3>
                  <p className="text-xs text-slate-400">Manage floating market orders, adjust stop loss, or close lots.</p>
                </div>
                <div className="text-right font-mono">
                  <span className="text-xs text-slate-400">Total Unrealized P&L: </span>
                  <span
                    className={`font-bold text-base ${
                      totalFloatingPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {totalFloatingPnl >= 0 ? '+' : ''}${totalFloatingPnl.toFixed(2)} USD
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto pt-3">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="text-slate-400 uppercase text-[10px] border-b border-slate-800">
                      <th className="py-3 px-3">Ticket ID</th>
                      <th className="py-3 px-3">Symbol</th>
                      <th className="py-3 px-3">Type</th>
                      <th className="py-3 px-3">Lots</th>
                      <th className="py-3 px-3">Open Price</th>
                      <th className="py-3 px-3">Current Price</th>
                      <th className="py-3 px-3">SL</th>
                      <th className="py-3 px-3">TP</th>
                      <th className="py-3 px-3">Floating P&L</th>
                      <th className="py-3 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {openPositions.map((pos) => (
                      <tr key={pos.id} className="hover:bg-slate-800/40">
                        <td className="py-3 px-3 text-slate-400">#{pos.id.slice(-6)}</td>
                        <td className="py-3 px-3 font-bold text-white">{pos.symbol}</td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              pos.type === 'BUY'
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : 'bg-rose-500/20 text-rose-300'
                            }`}
                          >
                            {pos.type}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-200">{pos.lots}</td>
                        <td className="py-3 px-3 text-slate-200">{pos.openPrice.toFixed(4)}</td>
                        <td className="py-3 px-3 text-cyan-300 font-bold">{pos.currentPrice.toFixed(4)}</td>
                        <td className="py-3 px-3 text-slate-400">{pos.stopLoss ? pos.stopLoss.toFixed(4) : 'None'}</td>
                        <td className="py-3 px-3 text-slate-400">{pos.takeProfit ? pos.takeProfit.toFixed(4) : 'None'}</td>
                        <td
                          className={`py-3 px-3 font-bold ${
                            pos.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {pos.profit >= 0 ? '+' : ''}${pos.profit.toFixed(2)}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => onClosePosition(pos.id)}
                            className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-sans text-xs font-bold transition-colors cursor-pointer"
                          >
                            Close Position
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Closed Trades History */}
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-xl">
              <h3 className="text-lg font-bold text-white mb-3">Recently Closed Positions</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="text-slate-400 uppercase text-[10px] border-b border-slate-800">
                      <th className="py-2.5 px-3">Symbol</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Lots</th>
                      <th className="py-2.5 px-3">Open</th>
                      <th className="py-2.5 px-3">Close</th>
                      <th className="py-2.5 px-3">Realized Profit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {closedTrades.map((trade) => (
                      <tr key={trade.id}>
                        <td className="py-2.5 px-3 font-bold text-white">{trade.symbol}</td>
                        <td className="py-2.5 px-3 text-slate-300">{trade.type}</td>
                        <td className="py-2.5 px-3 text-slate-300">{trade.lots}</td>
                        <td className="py-2.5 px-3 text-slate-400">{trade.openPrice.toFixed(4)}</td>
                        <td className="py-2.5 px-3 text-slate-400">{trade.closePrice.toFixed(4)}</td>
                        <td
                          className={`py-2.5 px-3 font-bold ${
                            trade.finalProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {trade.finalProfit >= 0 ? '+' : ''}${trade.finalProfit.toFixed(2)} USD
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: FUNDS (DEPOSIT & WITHDRAW) */}
        {activeTab === 'funds' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Deposit Form */}
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-xl">
              <div className="flex items-center gap-2 pb-4 border-b border-slate-800">
                <ArrowDownLeft className="w-5 h-5 text-cyan-400" />
                <h3 className="text-lg font-bold text-white">Deposit Capital</h3>
              </div>

              <form onSubmit={handleDepositSubmit} className="space-y-4 pt-4">
                <div>
                  <label className="text-xs text-slate-400 block mb-1.5">Payment Method</label>
                  <select
                    value={depositMethod}
                    onChange={(e) => setDepositMethod(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white"
                  >
                    <option value="USDT (TRC20)">Tether USDT (TRC20 - Instant, 0% Fee)</option>
                    <option value="USDT (ERC20)">Tether USDT (ERC20)</option>
                    <option value="Bank Wire Transfer">International Wire Transfer (SWIFT)</option>
                    <option value="Visa / Mastercard">Credit / Debit Card (Visa, Mastercard)</option>
                    <option value="Crypto BTC">Bitcoin (BTC Interbank Gateway)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1.5">Deposit Amount (USD)</label>
                  <input
                    type="number"
                    min="10"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-white font-mono font-bold"
                  />
                </div>

                {depositMethod.includes('USDT') && (
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center space-y-2">
                    <div className="text-[11px] text-slate-400">Send TRC20 USDT to Segregated Custody Address:</div>
                    <div className="font-mono text-xs text-cyan-400 bg-slate-900 p-2 rounded break-all select-all">
                      TYc91kxP4wR2LnMvK7xP1qZtA99vB10492
                    </div>
                    <div className="text-[10px] text-emerald-400 flex items-center justify-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Automatic blockchain detection & instant credit
                    </div>
                  </div>
                )}

                {depositSuccessMsg && (
                  <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{depositSuccessMsg}</span>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl font-bold text-xs text-slate-950 bg-cyan-400 hover:bg-cyan-300 transition-colors shadow-lg cursor-pointer"
                >
                  Deposit Now
                </button>
              </form>
            </div>

            {/* Withdraw Form */}
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-xl">
              <div className="flex items-center gap-2 pb-4 border-b border-slate-800">
                <ArrowUpRight className="w-5 h-5 text-emerald-400" />
                <h3 className="text-lg font-bold text-white">Withdrawal Request</h3>
              </div>

              <form onSubmit={handleWithdrawSubmit} className="space-y-4 pt-4">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex justify-between items-center text-xs">
                  <span className="text-slate-400">Available to Withdraw:</span>
                  <span className="font-mono text-white font-bold">${freeMargin.toLocaleString()} USD</span>
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1.5">Withdrawal Destination</label>
                  <select
                    value={withdrawMethod}
                    onChange={(e) => setWithdrawMethod(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white"
                  >
                    <option value="USDT (TRC20)">Tether USDT (TRC20)</option>
                    <option value="Bank Wire Transfer">Bank Wire Transfer (SWIFT)</option>
                    <option value="Visa / Mastercard">Original Card Refund</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1.5">Amount (USD)</label>
                  <input
                    type="number"
                    min="50"
                    max={freeMargin}
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-white font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1.5">Destination Address / Account</label>
                  <input
                    type="text"
                    placeholder="Enter wallet address or IBAN"
                    defaultValue="TYc91kxP4wR2LnMvK7xP1qZtA99vB10492"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white font-mono"
                  />
                </div>

                {withdrawSuccessMsg && (
                  <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{withdrawSuccessMsg}</span>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl font-bold text-xs text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors shadow-lg cursor-pointer"
                >
                  Submit Withdrawal Request
                </button>
              </form>
            </div>
          </div>
        )}

        {/* TAB 4: KYC & SECURITY */}
        {activeTab === 'kyc' && (
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-white">KYC Verification & Account Security</h3>
                <p className="text-xs text-slate-400">
                  Compliant with CFSA / FSA AML and Anti-Terrorist Financing Directives.
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-bold font-mono">
                <CheckCircle2 className="w-4 h-4" /> Full Verification Level 2
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Identity Verification */}
              <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-sm text-white">Tier 1: Identity (POI)</div>
                  <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                    {kyc.tier1Identity}
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Government-issued Passport, National Identity Card, or Driving License.
                </p>
                <div className="pt-2 text-xs font-mono text-slate-300">
                  <div>Name: {kyc.fullName}</div>
                  <div>Email: {kyc.email}</div>
                  <div>Phone: {kyc.phone}</div>
                </div>
              </div>

              {/* Address Verification */}
              <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-sm text-white">Tier 2: Proof of Address (POA)</div>
                  <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                    {kyc.tier2Address}
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Bank Statement or Utility Bill dated within the last 3 months.
                </p>
                <div className="pt-2 text-xs font-mono text-slate-300">
                  <div>Jurisdiction: International / UAE Residence</div>
                  <div>Document: Tier-1 Bank Statement (Verified)</div>
                </div>
              </div>
            </div>

            {/* Document Upload Simulation */}
            <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 text-center space-y-3">
              <div className="text-xs text-slate-400">
                Need to submit additional documentation or update expired ID?
              </div>
              <button
                onClick={handleKycUpload}
                disabled={kycUploading}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 text-xs font-bold transition-all cursor-pointer"
              >
                {kycUploading ? 'Encrypting & Verifying...' : 'Upload Updated ID Document'}
              </button>
              {kycSuccessMsg && (
                <div className="text-xs text-emerald-400 font-semibold">{kycSuccessMsg}</div>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: TRANSACTION HISTORY */}
        {activeTab === 'history' && (
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white">Ledger & Transaction History</h3>
              <button
                onClick={() => alert('Exporting monthly statement CSV...')}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Statement (CSV)</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="text-slate-400 uppercase text-[10px] border-b border-slate-800">
                    <th className="py-3 px-3">Date & Time</th>
                    <th className="py-3 px-3">Type</th>
                    <th className="py-3 px-3">Method / Reference</th>
                    <th className="py-3 px-3">Amount</th>
                    <th className="py-3 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-800/40">
                      <td className="py-3 px-3 text-slate-300">{tx.date}</td>
                      <td className="py-3 px-3 font-bold text-white">{tx.type}</td>
                      <td className="py-3 px-3 text-slate-400">{tx.method || tx.txHash || 'Standard Settlement'}</td>
                      <td className="py-3 px-3 font-bold text-emerald-400">
                        +${tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD
                      </td>
                      <td className="py-3 px-3">
                        <span className="bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded text-[10px] font-bold">
                          {tx.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
