import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  Activity,
  Award,
  ChevronRight,
  Mail,
  Phone,
  MapPin,
  MessageCircle,
  Send,
  Headphones,
  ChevronDown,
  ExternalLink,
  Check
} from 'lucide-react';

export const Footer: React.FC = () => {
  const [showWhatsAppOptions, setShowWhatsAppOptions] = useState(false);

  return (
    <footer id="main-footer" className="bg-navy-950 border-t border-navy-700/80 text-xs text-slate-400 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Brand Info */}
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gold-metallic flex items-center justify-center text-slate-950 font-black shadow-gold">
                <Activity className="w-4 h-4 text-slate-950" />
              </div>
              <span className="font-extrabold text-white text-base tracking-tight">CONNECT</span>
              <span className="font-light text-amber-300 text-base tracking-wider">FINANCIALS</span>
            </div>
            <p className="text-slate-300 text-xs leading-relaxed max-w-sm">
              Connect Financials is a premier international forex and contracts for difference (CFD) brokerage firm providing institutional multi-bank liquidity, transparent spreads, and sub-millisecond execution to global traders.
            </p>
            <div className="flex items-center gap-3 pt-2 text-[11px] text-slate-300">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Segregated Custody
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-amber-400" /> Negative Balance Protection
              </span>
            </div>
          </div>

          {/* Accounts Links */}
          <div className="space-y-2.5">
            <h4 className="font-bold text-white uppercase text-[11px] tracking-wider">Trading Accounts</h4>
            <ul className="space-y-1.5 text-xs text-slate-400">
              <li><a href="#accounts-section" className="hover:text-amber-300 transition-colors">Standard Account</a></li>
              <li><a href="#accounts-section" className="hover:text-amber-300 transition-colors">Plus Account (Most Popular)</a></li>
              <li><a href="#accounts-section" className="hover:text-amber-300 transition-colors">Raw Spread Account</a></li>
              <li><a href="#accounts-section" className="hover:text-amber-300 transition-colors">Islamic Swap-Free</a></li>
              <li><a href="#accounts-section" className="hover:text-amber-300 transition-colors">Free Practice Demo Account</a></li>
            </ul>
          </div>

          {/* Market Visualization & Tools */}
          <div className="space-y-2.5">
            <h4 className="font-bold text-white uppercase text-[11px] tracking-wider">Trading Tools</h4>
            <ul className="space-y-1.5 text-xs text-slate-400">
              <li><a href="#calculators-section" className="hover:text-amber-300 transition-colors">Capital & Risk Management Calculator</a></li>
              <li><a href="#chart-terminal-section" className="hover:text-amber-300 transition-colors">Live Candlestick Terminal</a></li>
              <li><a href="#order-book-dom" className="hover:text-amber-300 transition-colors">Level II Order Book (DOM)</a></li>
              <li><a href="#calculators-section" className="hover:text-amber-300 transition-colors">Margin & Pip Calculators</a></li>
              <li><a href="#calendar-section" className="hover:text-amber-300 transition-colors">Economic Calendar</a></li>
              <li><a href="#market-watch-section" className="hover:text-amber-300 transition-colors">Live Market Watch Screener</a></li>
            </ul>
          </div>

          {/* Company & Support */}
          <div className="space-y-2.5">
            <h4 className="font-bold text-white uppercase text-[11px] tracking-wider">Connect Financials Ltd</h4>
            <ul className="space-y-1.5 text-xs text-slate-400">
              <li><a href="#about-us-section" className="text-cyan-300 hover:text-cyan-200 transition-colors font-medium">About Connect Financials</a></li>
              <li><a href="#legal-terms-section" className="text-amber-300 hover:text-amber-200 transition-colors font-medium">Terms & Conditions Hub</a></li>
              <li><a href="#currencies-section" className="text-slate-300 hover:text-white transition-colors">Tradable Currencies & FX</a></li>
              <li className="pt-1 text-slate-300">
                <span className="text-[10px] text-slate-400 block font-semibold">Registered Headquarters:</span>
                <span>House of Francis, Ile du Port, English River, Victoria, Mahé, Seychelles</span>
              </li>
              <li className="text-slate-300">
                <span className="text-[10px] text-slate-400 block font-semibold">Direct Email Desk:</span>
                <a href="mailto:support@connectfinancials.com" className="text-amber-300 hover:underline">support@connectfinancials.com</a>
              </li>
              <li><span className="text-slate-300">Seychelles SFSA License: SD244</span></li>
              <li><span className="text-emerald-400 font-mono">24/5 Live Trader Support Desk</span></li>
            </ul>
          </div>
        </div>

        {/* User-Requested Corporate Directory & Channels Hub */}
        <div className="pt-10 border-t border-navy-800/90">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 text-slate-300">
            {/* Column 1: Connect Financials & Contact Us */}
            <div className="lg:col-span-5 space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gold-metallic flex items-center justify-center text-slate-950 font-black shadow-gold">
                  <Activity className="w-4 h-4 text-slate-950" />
                </div>
                <span className="font-extrabold text-white text-lg tracking-tight">Connect Financials</span>
              </div>
              <p className="text-slate-300 text-xs leading-relaxed max-w-sm">
                Your trusted partner for forex trading. Experience ultra-low spreads, lightning-fast execution, and zero commissions.
              </p>

              <div className="pt-2 space-y-3.5">
                <h5 className="text-white font-bold text-xs uppercase tracking-wider">Contact Us</h5>

                {/* Emails */}
                <div className="flex items-start gap-2.5 text-xs">
                  <Mail className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <div>
                      <span className="text-slate-400">General: </span>
                      <a href="mailto:info@connectfinancials.com" className="text-slate-200 hover:text-amber-300 transition-colors font-medium">
                        info@connectfinancials.com
                      </a>
                    </div>
                    <div>
                      <span className="text-slate-400">Support: </span>
                      <a href="mailto:support@connectfinancials.com" className="text-slate-200 hover:text-amber-300 transition-colors font-medium">
                        support@connectfinancials.com
                      </a>
                    </div>
                  </div>
                </div>

                {/* Phone */}
                <div className="flex items-center gap-2.5 text-xs">
                  <Phone className="w-4 h-4 text-amber-400 shrink-0" />
                  <a href="tel:0035722250435" className="text-slate-200 hover:text-amber-300 transition-colors font-mono font-medium">
                    0035722250435
                  </a>
                </div>

                {/* Cyprus European Office */}
                <div className="flex items-start gap-2.5 text-xs">
                  <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-white block">European Office – Cyprus</span>
                    <span className="text-slate-300 leading-snug block">
                      Taki Sofokleous 23A, 2049, Strovolos, Nicosia, Cyprus
                    </span>
                  </div>
                </div>

                {/* Seychelles Address */}
                <div className="flex items-start gap-2.5 text-xs">
                  <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-white block">Address:</span>
                    <span className="text-slate-300 leading-snug block">
                      302, House of Francis, Ile du Port, English River, Mahe, Seychelles
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Column 2: Quick Links */}
            <div className="lg:col-span-2 space-y-3">
              <h5 className="text-white font-bold text-xs uppercase tracking-wider">Quick Links</h5>
              <ul className="space-y-2 text-xs text-slate-400">
                <li>
                  <a href="#about-us-section" className="hover:text-amber-300 transition-colors block">About Us</a>
                </li>
                <li>
                  <a href="#accounts-section" className="hover:text-amber-300 transition-colors block">Trading Accounts</a>
                </li>
                <li>
                  <a href="#currencies-section" className="hover:text-amber-300 transition-colors block">Tradable Assets</a>
                </li>
                <li>
                  <a href="#calendar-section" className="hover:text-amber-300 transition-colors block">Blog &amp; News</a>
                </li>
              </ul>
            </div>

            {/* Column 3: Support */}
            <div className="lg:col-span-2 space-y-3">
              <h5 className="text-white font-bold text-xs uppercase tracking-wider">Support</h5>
              <ul className="space-y-2 text-xs text-slate-400">
                <li>
                  <a href="#legal-terms-section" className="hover:text-amber-300 transition-colors block">Contact Us</a>
                </li>
                <li>
                  <a href="#accounts-section" className="hover:text-amber-300 transition-colors block">Partners</a>
                </li>
                <li>
                  <a href="#legal-terms-section" className="hover:text-amber-300 transition-colors block">Terms &amp; Conditions</a>
                </li>
                <li>
                  <a href="#legal-terms-section" className="hover:text-amber-300 transition-colors block">Privacy Policy</a>
                </li>
              </ul>
            </div>

            {/* Column 4: Join Our Channels */}
            <div className="lg:col-span-3 space-y-3">
              <h5 className="text-white font-bold text-xs uppercase tracking-wider">Join Our Channels</h5>
              <p className="text-xs text-slate-400 leading-relaxed">
                Join our community channels for daily market analysis, trading signals, and exclusive insights.
              </p>

              {/* Channels & Support Buttons */}
              <div className="space-y-2.5 pt-1">
                {/* WhatsApp Channel */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowWhatsAppOptions(!showWhatsAppOptions)}
                    className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-navy-900 hover:bg-navy-850 border border-emerald-500/40 hover:border-emerald-400 text-white text-xs font-semibold transition-all cursor-pointer group shadow-sm"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                        <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                      </div>
                      <span className="text-slate-100 font-medium">WhatsApp Channel</span>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-slate-400 group-hover:text-emerald-400 transition-transform ${showWhatsAppOptions ? 'rotate-180' : ''}`} />
                  </button>

                  {showWhatsAppOptions && (
                    <div className="mt-1 p-2 rounded-xl bg-navy-900 border border-emerald-500/30 shadow-xl space-y-1 text-xs">
                      <a
                        href="https://chat.whatsapp.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-emerald-500/10 text-emerald-300 transition-colors"
                      >
                        <span>VIP Signals &amp; Market Alerts</span>
                        <ExternalLink className="w-3 h-3 text-emerald-400" />
                      </a>
                      <a
                        href="https://wa.me/35722250435"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-emerald-500/10 text-slate-300 hover:text-white transition-colors"
                      >
                        <span>Direct WhatsApp Support</span>
                        <ExternalLink className="w-3 h-3 text-emerald-400" />
                      </a>
                    </div>
                  )}
                </div>

                {/* Telegram Channel Button */}
                <a
                  href="https://t.me/connectfinancials"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-[#0088cc] hover:bg-[#0077b5] text-white text-xs font-bold transition-all shadow-md group cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <Send className="w-4 h-4 text-white group-hover:scale-110 transition-transform" />
                    <span>Telegram Channel</span>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-white/80" />
                </a>

                {/* 24/7 Live Support Callout */}
                <div className="p-3 rounded-xl bg-navy-900/90 border border-navy-700/80 flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
                    <Headphones className="w-4 h-4" />
                  </div>
                  <div className="text-[11px] leading-snug">
                    <div className="text-white font-bold flex items-center gap-1.5">
                      <span>24/7 Live Support</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    </div>
                    <p className="text-slate-400 mt-0.5">
                      Click the chat widget on your screen to connect instantly.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Regulatory & Risk Disclaimers */}
        <div className="pt-8 border-t border-navy-800 space-y-3 text-[11px] leading-relaxed text-slate-400">
          <p>
            <strong className="text-slate-200">High Risk Investment Warning:</strong> Trading Foreign Exchange (Forex) and Contracts for Difference (CFDs) carries a high level of risk and may not be suitable for all investors. The high degree of leverage can work against you as well as for you. Before deciding to trade Forex/CFDs with Connect Financials, you should carefully consider your investment objectives, level of experience, and risk appetite. There is a possibility that you may sustain a loss in excess of your initial investment. You should only trade with risk capital you can afford to lose.
          </p>
          <p>
            <strong className="text-slate-200">Regulatory Disclosures:</strong> Connect Financials Ltd is authorized and regulated by the Seychelles Financial Services Authority (SFSA) under License No. SD244 and Comoros Financial Services Authority (CFSA) under License No. HY00523008. Operating from House of Francis, Ile du Port, English River, Mahé, Seychelles. Client funds are strictly kept in segregated accounts with Tier-1 banking institutions, completely independent from company operational capital.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-between pt-4 border-t border-navy-800 text-slate-400 text-[11px]">
            <div>© {new Date().getFullYear()} Connect Financials Ltd. All rights reserved.</div>
            <div className="flex items-center gap-4 mt-2 sm:mt-0">
              <a href="#legal-terms-section" className="hover:text-amber-300 transition-colors">Privacy Policy</a>
              <span>•</span>
              <a href="#legal-terms-section" className="hover:text-amber-300 transition-colors">Terms & Conditions</a>
              <span>•</span>
              <a href="#legal-terms-section" className="hover:text-amber-300 transition-colors">Order Execution Policy</a>
              <span>•</span>
              <a href="#legal-terms-section" className="hover:text-amber-300 transition-colors">AML & KYC</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
