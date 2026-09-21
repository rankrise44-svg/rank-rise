import React, { useState } from 'react';
import {
  ShieldCheck,
  Building2,
  MapPin,
  Mail,
  Phone,
  Clock,
  FileText,
  Lock,
  Scale,
  CheckCircle2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Globe,
  Award,
  HelpCircle,
  Copy,
  Check
} from 'lucide-react';

interface Props {
  onOpenAccount?: () => void;
  /** Set false when a page header above already carries the title. */
  showHeading?: boolean;
}

export const LegalTermsAndContactSection: React.FC<Props> = ({ onOpenAccount, showHeading = true }) => {
  const [activeTab, setActiveTab] = useState<'terms' | 'risk' | 'execution' | 'aml' | 'privacy' | 'deposits'>('terms');
  const [copiedEmail, setCopiedEmail] = useState(false);

  const handleCopyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const legalDocuments = {
    terms: {
      title: 'Terms & Conditions (Client Agreement)',
      lastUpdated: 'August 2024 (Version 4.2)',
      sections: [
        {
          heading: '1. Introduction & Company Capacity',
          body: 'Connect Financials Ltd ("the Company") is registered in the Republic of Seychelles under registration number SD244, authorized and regulated by the Seychelles Financial Services Authority (SFSA). This Agreement governs all trading accounts, financial transactions, margin orders, and algorithmic integrations executed through Connect Financials platforms and MetaTrader 5.'
        },
        {
          heading: '2. Direct Market Access (STP/ECN) & No Dealing Desk',
          body: 'All client orders are executed on a Straight-Through-Processing (STP) basis without dealing desk intervention. Quotes reflect direct aggregated feeds from institutional Tier-1 banks co-located inside the Equinix NY4 and LD4 financial data centers. The Company does not trade as a market maker against client positions.'
        },
        {
          heading: '3. Margin Requirements, Leverage & Negative Balance Protection',
          body: 'Leverage is provided up to 1:500 depending on the selected account tier and asset class. A margin call warning is triggered when account equity falls below 100% of required margin. Forced liquidation (Stop-Out) occurs strictly at 50% equity-to-margin ratio. Connect Financials legally guarantees Negative Balance Protection: retail clients can never lose more than their deposited capital.'
        },
        {
          heading: '4. Islamic Swap-Free Accounts',
          body: 'Clients of Muslim faith may request an Islamic Swap-Free account tier, which waives all overnight rollover interest charges on currency pairs and spot metals in strict conformity with Sharia financial principles, subject to fair usage administration.'
        }
      ]
    },
    risk: {
      title: 'High-Risk Investment Disclosure',
      lastUpdated: 'August 2024 (Version 3.1)',
      sections: [
        {
          heading: '1. General Forex & CFD Leverage Warning',
          body: 'Trading Foreign Exchange (Forex) and Contracts for Difference (CFDs) involves substantial risk of loss and is not suitable for all investors. The high degree of financial leverage allows traders to control large market positions with relatively modest margin; however, leverage magnifies both profits and losses equally.'
        },
        {
          heading: '2. Market Volatility & Price Slippage',
          body: 'Financial markets are subject to sudden macroeconomic announcements, central bank interest rate decisions, geopolitical shocks, and liquidity gaps. While Connect Financials utilizes ultra-low latency infrastructure to minimize slippage, market orders placed during extreme volatility or outside standard session hours may experience positive or negative execution slippage.'
        },
        {
          heading: '3. Independent Financial Advice',
          body: 'Before initiating any live trades, you must assess whether your investment objectives, financial situation, and trading experience align with the speculative nature of derivative instruments. You should never risk capital you cannot afford to lose completely.'
        }
      ]
    },
    execution: {
      title: 'Order Execution & Best Execution Policy',
      lastUpdated: 'July 2024 (Version 2.8)',
      sections: [
        {
          heading: '1. Best Execution Mandate',
          body: 'Connect Financials is committed to delivering Best Execution under international regulatory guidelines. Orders are routed to the most advantageous Tier-1 liquidity provider based on price, execution speed, fill ratio, and liquidity depth at the exact millisecond of submission.'
        },
        {
          heading: '2. Optical NY4 Infrastructure & Latency',
          body: 'Our order matching engine is hosted directly in the Equinix NY4 facility (Secaucus, NJ) with optical cross-connects to LD4 (London) and TY3 (Tokyo). Average execution latency is certified under 10 milliseconds, with an order fill rate exceeding 99.9% without manual dealer re-quotes.'
        },
        {
          heading: '3. Slippage & Asymmetric Price Improvements',
          body: 'Connect Financials supports full asymmetric positive slippage. If the interbank market moves in your favor between submission and execution, your order is filled at the superior price point, directly passing savings to the trader.'
        }
      ]
    },
    aml: {
      title: 'Anti-Money Laundering (AML) & KYC Policy',
      lastUpdated: 'August 2024 (Version 5.0)',
      sections: [
        {
          heading: '1. Regulatory Compliance Framework',
          body: 'Connect Financials Ltd strictly enforces international Anti-Money Laundering (AML) and Counter-Terrorist Financing (CTF) directives. In compliance with the Seychelles Financial Services Authority and international FATF recommendations, all accounts require verified identification prior to capital withdrawal.'
        },
        {
          heading: '2. Customer Due Diligence (CDD)',
          body: 'Every trader must provide a valid government-issued photographic ID (Passport, National ID Card, or Driver’s License) and a Proof of Residential Address issued within the past 90 days (Utility bill or bank statement). High-net-worth accounts undergo enhanced source-of-wealth verification.'
        },
        {
          heading: '3. Third-Party Payment Prohibition',
          body: 'Funds may only be deposited and withdrawn using bank accounts, credit cards, or authorized crypto wallets held in the identical legal name as the registered trading account. Third-party transfers are strictly rejected.'
        }
      ]
    },
    privacy: {
      title: 'Privacy Policy & Data Security',
      lastUpdated: 'June 2024 (Version 3.4)',
      sections: [
        {
          heading: '1. Data Encryption & Storage',
          body: 'Connect Financials employs military-grade 256-bit SSL encryption for all web and API communications. Personal data and trade records are stored in ISO/IEC 27001 certified data vaults with strict multi-factor role-based access control.'
        },
        {
          heading: '2. No Third-Party Monetization',
          body: 'We never sell, rent, or monetize client personal data to advertisers or external commercial brokers. Information is collected solely to maintain account functionality, execute regulatory audits, and ensure platform security.'
        }
      ]
    },
    deposits: {
      title: 'Deposits, Withdrawals & Segregated Funds',
      lastUpdated: 'August 2024 (Version 3.0)',
      sections: [
        {
          heading: '1. Tier-1 Segregated Accounts',
          body: 'All client capital is held in segregated client bank accounts with top-tier international financial institutions. These funds are legally ring-fenced and cannot be accessed by Connect Financials for corporate overhead, hedging operational costs, or firm liabilities.'
        },
        {
          heading: '2. Zero Fee Deposits & Processing Speed',
          body: 'Connect Financials charges 0% deposit fees on bank wires, credit cards, and approved digital assets. Withdrawal requests received during market operating hours are processed on the same business day.'
        }
      ]
    }
  };

  return (
    <section id="legal-terms-section" className="py-8 sm:py-10 bg-navy-950 border-t border-navy-800 text-slate-300 relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-6">
        {/* Header */}
        {showHeading && (
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-navy-900 border border-navy-700 text-amber-300 text-xs font-semibold">
              <Scale className="w-3.5 h-3.5 text-amber-400" />
              <span>Official Corporate Identity & Compliance Hub</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Connect Financials <span className="text-amber-400">Headquarters & Terms</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Registered corporate details, direct institutional desk contacts, official licensing records, and comprehensive regulatory policies governing Connect Financials Ltd.
            </p>
          </div>
        )}

        {/* Corporate Address & Direct Contact Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Registered Office Address */}
          <div className="p-6 rounded-2xl bg-navy-900/90 border border-navy-700/80 hover:border-amber-400/50 transition-all space-y-4 shadow-xl flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <MapPin className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <div className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400">
                  Global Registered Office
                </div>
                <h3 className="text-lg font-extrabold text-white">Connect Financials Ltd</h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
                House of Francis, Ile du Port,<br />
                English River, Victoria, Mahé,<br />
                <strong className="text-white">Republic of Seychelles</strong>
              </p>
            </div>

            <div className="pt-3 border-t border-navy-800 flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" /> Physical Headquarters
              </span>
              <a
                href="https://connectfinancials.com"
                target="_blank"
                rel="noreferrer"
                className="text-amber-300 hover:text-amber-200 flex items-center gap-1 font-semibold"
              >
                <span>connectfinancials.com</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Card 2: Official Support & Direct Emails */}
          <div className="p-6 rounded-2xl bg-navy-900/90 border border-navy-700/80 hover:border-cyan-400/50 transition-all space-y-4 shadow-xl flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <Mail className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <div className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400">
                  Direct Inquiries & Support
                </div>
                <h3 className="text-lg font-extrabold text-white">Institutional Support Desk</h3>
              </div>
              
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-2 rounded-lg bg-navy-950/80 border border-navy-800">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase block font-semibold">General & Trader Support:</span>
                    <strong className="text-white font-mono text-xs select-all">support@connectfinancials.com</strong>
                  </div>
                  <button
                    onClick={() => handleCopyEmail('support@connectfinancials.com')}
                    className="p-1.5 rounded bg-navy-800 hover:bg-navy-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                    title="Copy Email"
                  >
                    {copiedEmail ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>

                <div className="flex items-center justify-between p-2 rounded-lg bg-navy-950/80 border border-navy-800">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase block font-semibold">Compliance & Legal Desk:</span>
                    <strong className="text-white font-mono text-xs select-all">compliance@connectfinancials.com</strong>
                  </div>
                  <button
                    onClick={() => handleCopyEmail('compliance@connectfinancials.com')}
                    className="p-1.5 rounded bg-navy-800 hover:bg-navy-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                    title="Copy Email"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-navy-800 flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1.5 text-cyan-400 font-medium">
                <Clock className="w-3.5 h-3.5" /> 24/5 Live Desk Response
              </span>
              <span className="font-mono text-[11px] text-slate-400">Avg &lt; 15 mins</span>
            </div>
          </div>

          {/* Card 3: Regulatory Licenses & Compliance Seals */}
          <div className="p-6 rounded-2xl bg-navy-900/90 border border-navy-700/80 hover:border-emerald-400/50 transition-all space-y-4 shadow-xl flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <div className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400">
                  Regulatory Authorities
                </div>
                <h3 className="text-lg font-extrabold text-white">Licensing & Oversight</h3>
              </div>

              <div className="space-y-2 text-xs">
                <div className="p-2.5 rounded-lg bg-navy-950/80 border border-navy-800 space-y-0.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-white">Seychelles FSA (SFSA)</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                      ACTIVE
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-amber-300 font-bold">License No. SD244</div>
                  <div className="text-[10px] text-slate-400">Securities Dealer & Brokerage Authorization</div>
                </div>

                <div className="p-2.5 rounded-lg bg-navy-950/80 border border-navy-800 space-y-0.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-white">Comoros Financial Authority</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                      ACTIVE
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-amber-300 font-bold">License No. HY00523008</div>
                  <div className="text-[10px] text-slate-400">International Brokerage & Clearing Member</div>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-navy-800 flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <Award className="w-3.5 h-3.5" /> Fully Authorized Firm
              </span>
              <span className="text-slate-400 text-[11px]">Segregated Accounts</span>
            </div>
          </div>
        </div>

        {/* Interactive Terms & Conditions Documentation Hub */}
        <div className="p-6 sm:p-8 rounded-3xl bg-navy-900/80 border border-navy-700/80 shadow-2xl backdrop-blur-md space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-navy-700/80">
            <div>
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-400" />
                <h3 className="text-xl sm:text-2xl font-extrabold text-white">
                  Regulatory Documentation & Legal Policies
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Select any policy below to inspect the legally binding provisions, trading protections, and customer rights.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" /> 100% Negative Balance Protected
              </span>
            </div>
          </div>

          {/* Policy Navigation Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
            {[
              { id: 'terms', label: 'Client Agreement (Terms)' },
              { id: 'risk', label: 'Risk Disclosure Notice' },
              { id: 'execution', label: 'Order Execution Policy' },
              { id: 'aml', label: 'AML & KYC Policy' },
              { id: 'deposits', label: 'Deposits & Segregation' },
              { id: 'privacy', label: 'Privacy & Data Policy' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'bg-navy-950 text-slate-300 hover:text-white hover:bg-navy-800 border border-navy-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Active Policy Content Viewer */}
          <div className="p-6 rounded-2xl bg-navy-950/90 border border-navy-800 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-navy-800 text-xs">
              <div className="text-base font-extrabold text-white">
                {legalDocuments[activeTab].title}
              </div>
              <div className="text-slate-400 font-mono text-[11px]">
                {legalDocuments[activeTab].lastUpdated}
              </div>
            </div>

            <div className="space-y-5">
              {legalDocuments[activeTab].sections.map((sec, idx) => (
                <div key={idx} className="space-y-1.5">
                  <h4 className="text-sm font-bold text-amber-300">{sec.heading}</h4>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
                    {sec.body}
                  </p>
                </div>
              ))}
            </div>

            {/* Quick Policy Footer Notice */}
            <div className="p-4 rounded-xl bg-navy-900/80 border border-navy-800 text-[11px] text-slate-400 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                By registering an account with Connect Financials Ltd or depositing capital, you acknowledge and agree to the latest terms published herein. To request signed PDF copies or corporate audit documentation, contact <strong className="text-amber-300">compliance@connectfinancials.com</strong>.
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
