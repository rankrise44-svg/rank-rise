import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, CheckCircle2, ArrowRight, Sparkles, Compass } from 'lucide-react';
import { TradingAccount } from '../types';
import goldenEagleImg from '../assets/images/golden_eagle_3d_1789734294509.jpg';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  defaultTier?: string;
  onAccountCreated: (account: TradingAccount) => void;
}

export const OpenAccountModal: React.FC<Props> = ({
  isOpen,
  onClose,
  defaultTier = 'plus',
  onAccountCreated
}) => {
  const [accountType, setAccountType] = useState(defaultTier === 'demo' ? 'demo' : defaultTier);
  const [isDemo, setIsDemo] = useState(defaultTier === 'demo');
  const [fullName, setFullName] = useState('Hussein Marmal');
  const [email, setEmail] = useState('husseinmarmal@gmail.com');
  const [country, setCountry] = useState('United Arab Emirates');
  const [leverage, setLeverage] = useState('1:500');
  const [currency, setCurrency] = useState('USD');
  const [createdSuccess, setCreatedSuccess] = useState<TradingAccount | null>(null);

  useEffect(() => {
    if (defaultTier === 'demo') {
      setIsDemo(true);
      setAccountType('demo');
    } else {
      setIsDemo(false);
      setAccountType(defaultTier);
    }
  }, [defaultTier, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const typeLabel = isDemo
      ? 'Demo'
      : accountType === 'raw'
      ? 'Raw'
      : accountType === 'standard'
      ? 'Standard'
      : accountType === 'islamic'
      ? 'Islamic'
      : 'Plus';

    const initialBal = isDemo ? 50000 : accountType === 'raw' ? 500 : accountType === 'standard' ? 100 : 250;
    const newAccNum = isDemo ? `CF-DM-${Math.floor(10000 + Math.random() * 90000)}` : `CF-${Math.floor(800000 + Math.random() * 199999)}`;

    const newAccount: TradingAccount = {
      id: `acc-${Date.now()}`,
      accountNumber: newAccNum,
      type: typeLabel as any,
      isLive: !isDemo,
      currency,
      balance: initialBal,
      equity: initialBal,
      margin: 0,
      freeMargin: initialBal,
      marginLevel: 0,
      leverage,
      server: isDemo ? 'ConnectFinancials-Demo' : 'ConnectFinancials-Live01',
      createdDate: new Date().toISOString().split('T')[0]
    };

    onAccountCreated(newAccount);
    setCreatedSuccess(newAccount);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-navy-900 border-2 border-navy-700 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl relative">
        {/* Metallic Gold accent line */}
        <div className="h-1 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-600" />

        {/* Header */}
        <div className="bg-navy-950 px-6 py-4 border-b border-navy-700/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden border border-amber-400/60 shadow-md relative bg-navy-900 shrink-0">
              <img
                src={goldenEagleImg}
                alt="Connect Financials 3D Eagle"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover scale-110"
              />
              <span className="absolute top-[37%] left-[48%] w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Open Connect Financials Account</h3>
              <p className="text-[11px] text-slate-300">Equinix NY4 Low-Latency Liquidity Bridge</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-navy-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {createdSuccess ? (
          <div className="p-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="text-xl font-extrabold text-white">Account Provisioned Successfully!</h4>
            <p className="text-xs text-slate-300 max-w-xs mx-auto">
              Your {createdSuccess.type} {createdSuccess.isLive ? 'Live' : 'Demo'} trading account is active and connected to our direct multi-bank liquidity pool.
            </p>

            <div className="bg-navy-950 p-4 rounded-xl border border-navy-700 text-left font-mono text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Account Number:</span>
                <span className="text-white font-bold">{createdSuccess.accountNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Server:</span>
                <span className="text-amber-300 font-semibold">{createdSuccess.server}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Starting Balance:</span>
                <span className="text-emerald-400 font-bold">${createdSuccess.balance.toLocaleString()} USD</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Account Leverage:</span>
                <span className="text-white">{createdSuccess.leverage}</span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-3.5 rounded-xl bg-gold-metallic hover:bg-gold-metallic-hover text-slate-950 font-extrabold text-xs shadow-gold cursor-pointer transition-all"
            >
              Access Trader Portal & Begin Trading
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
            {/* Live vs Demo Toggle */}
            <div className="grid grid-cols-2 gap-2 bg-navy-950 p-1 rounded-xl border border-navy-700 font-semibold">
              <button
                type="button"
                onClick={() => {
                  setIsDemo(false);
                  if (accountType === 'demo') setAccountType('plus');
                }}
                className={`py-2 rounded-lg transition-all ${
                  !isDemo ? 'bg-gold-metallic text-slate-950 font-bold shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                Live Real Account
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsDemo(true);
                  setAccountType('demo');
                }}
                className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1 ${
                  isDemo ? 'bg-gold-metallic text-slate-950 font-bold shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Free $50K Demo</span>
              </button>
            </div>

            {/* Account Tier */}
            <div>
              <label className="text-slate-300 block mb-1 font-bold">Select Account Tier</label>
              {isDemo ? (
                <div className="p-3 rounded-xl bg-navy-950 border border-amber-400/40 text-amber-300 font-mono text-xs">
                  Practice Demo Account ($50,000 Virtual Capital, Live Spreads & STP Simulation)
                </div>
              ) : (
                <select
                  value={accountType}
                  onChange={(e) => setAccountType(e.target.value)}
                  className="w-full bg-navy-950 border border-navy-700 rounded-xl p-2.5 text-white font-mono text-xs focus:outline-none focus:border-amber-400"
                >
                  <option value="plus">Plus Account (Most Popular - Spreads from 0.6 Pips, Zero Fee)</option>
                  <option value="standard">Standard Account (Spreads from 1.0 Pip, $100 Min)</option>
                  <option value="raw">Raw Spread Account (0.0 Pips Raw Interbank, $500 Min)</option>
                  <option value="islamic">Islamic Swap-Free (100% Sharia Certified Riba-Free)</option>
                </select>
              )}
            </div>

            {/* Full Name & Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-slate-300 block mb-1 font-medium">Full Name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-navy-950 border border-navy-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-400"
                />
              </div>
              <div>
                <label className="text-slate-300 block mb-1 font-medium">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-navy-950 border border-navy-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            {/* Leverage & Currency */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-slate-300 block mb-1 font-medium">Account Leverage</label>
                <select
                  value={leverage}
                  onChange={(e) => setLeverage(e.target.value)}
                  className="w-full bg-navy-950 border border-navy-700 rounded-xl p-2.5 text-white font-mono focus:outline-none focus:border-amber-400"
                >
                  <option value="1:500">1:500 (Institutional Connect Financials)</option>
                  <option value="1:200">1:200 (Flexible)</option>
                  <option value="1:100">1:100 (Standard)</option>
                  <option value="1:50">1:50 (Conservative)</option>
                </select>
              </div>
              <div>
                <label className="text-slate-300 block mb-1 font-medium">Base Currency</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full bg-navy-950 border border-navy-700 rounded-xl p-2.5 text-white font-mono focus:outline-none focus:border-amber-400"
                >
                  <option value="USD">USD ($ United States Dollar)</option>
                  <option value="EUR">EUR (€ Euro)</option>
                  <option value="GBP">GBP (£ British Pound)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 text-[11px] text-slate-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Funds segregated in Tier-1 custody banks. Negative balance protection active.</span>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-xl font-extrabold text-xs text-slate-950 bg-gold-metallic hover:bg-gold-metallic-hover shadow-gold cursor-pointer transition-all mt-2"
            >
              Confirm & Open {isDemo ? 'Practice Demo' : 'Live'} Account
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
