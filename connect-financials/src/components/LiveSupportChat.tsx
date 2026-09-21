import React, { useState } from 'react';
import { MessageSquare, X, Send, Bot, User, CheckCheck, ShieldCheck } from 'lucide-react';

export const LiveSupportChat: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Array<{ sender: 'bot' | 'user'; text: string; time: string }>>([
    {
      sender: 'bot',
      text: 'Welcome to Connect Financials 24/5 Trader Support Desk. How can our institutional desk assist you today?',
      time: 'Just now'
    }
  ]);
  const [input, setInput] = useState('');

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userText = input.trim();
    const userTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages((prev) => [...prev, { sender: 'user', text: userText, time: userTime }]);
    setInput('');

    // Automated smart answers based on forex terms
    setTimeout(() => {
      let reply = 'Thank you for reaching out to Connect Financials. Our senior broker is on standby. All accounts feature up to 1:500 leverage, segregated funds, and sub-12ms execution.';
      const lower = userText.toLowerCase();

      if (lower.includes('deposit') || lower.includes('minimum')) {
        reply = 'The minimum deposit is $100 for Standard, $250 for Plus (Most Popular), and $500 for our Raw Spread Account. Instant deposit options include USDT (TRC20 zero fee), Wire SWIFT, and Cards.';
      } else if (lower.includes('spread') || lower.includes('pip')) {
        reply = 'Our Raw Spread Account offers interbank spreads starting directly from 0.0 pips with $3.50 commission per lot side. Plus account features spreads from 0.6 pips with zero commission.';
      } else if (lower.includes('leverage')) {
        reply = 'Connect Financials provides flexible institutional leverage locked up to 1:500 across all accounts with automated negative balance protection.';
      } else if (lower.includes('islamic') || lower.includes('swap') || lower.includes('halal')) {
        reply = 'Yes! We offer a certified 100% Sharia-compliant Islamic Swap-Free account with zero overnight rollover fees or administrative penalties.';
      } else if (lower.includes('license') || lower.includes('regulation') || lower.includes('safe')) {
        reply = 'Connect Financials operates under Comoros Financial Services Authority (CFSA License HY00523008) and Seychelles FSA (SD244). All client funds are held in Tier-1 segregated custody banks.';
      } else if (lower.includes('ea') || lower.includes('scalping') || lower.includes('bot')) {
        reply = 'All trading styles including Scalping, High-Frequency Trading, Hedging, and automated Expert Advisors (EAs) are fully supported without restriction.';
      }

      setMessages((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: reply,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }, 600);
  };

  return (
    <div className="fixed bottom-5 right-5 z-40">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="p-3.5 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-2xl shadow-cyan-500/30 flex items-center gap-2 font-bold text-xs transition-all transform hover:scale-105 cursor-pointer"
        >
          <MessageSquare className="w-5 h-5" />
          <span className="hidden sm:inline">24/5 Trading Desk</span>
        </button>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl w-80 sm:w-96 shadow-2xl overflow-hidden flex flex-col h-[480px] animate-fadeIn">
          {/* Header */}
          <div className="bg-slate-950 p-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-xs text-white">Connect Financials Desk</h4>
                <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live Online 24/5
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 text-xs">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] p-3 rounded-2xl leading-relaxed ${
                    m.sender === 'user'
                      ? 'bg-cyan-500 text-slate-950 font-medium rounded-br-none'
                      : 'bg-slate-950 border border-slate-800 text-slate-200 rounded-bl-none'
                  }`}
                >
                  {m.text}
                </div>
                <span className="text-[9px] text-slate-400 mt-1 px-1">{m.time}</span>
              </div>
            ))}
          </div>

          {/* Input form */}
          <form onSubmit={handleSend} className="p-3 bg-slate-950 border-t border-slate-800 flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about accounts, spreads, leverage..."
              className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
            />
            <button
              type="submit"
              className="p-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-colors cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
