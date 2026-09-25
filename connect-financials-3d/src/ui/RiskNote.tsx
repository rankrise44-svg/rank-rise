import { RISK_WARNING_SHORT } from '../config/company';

/** Short risk warning, placed next to every call to action. */
export function RiskNote({ className = '' }: { className?: string }) {
  return <p className={`max-w-md text-[11px] leading-snug text-muted ${className}`}>{RISK_WARNING_SHORT}</p>;
}
