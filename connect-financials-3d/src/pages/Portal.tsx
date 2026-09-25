import { Link } from 'react-router-dom';

/** Trader Portal route — dashboard is built in a later stage. */
export default function Portal() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-abyss px-6 text-center">
      <img src="/favicon.png" alt="" width={48} height={48} />
      <h1 className="font-display text-4xl font-semibold uppercase text-ink">Trader Portal</h1>
      <p className="max-w-md text-muted">Accounts, balances, open positions, closed trades, transactions and KYC status arrive in a later stage.</p>
      <Link to="/" className="rounded-full border border-gold/40 px-6 py-2.5 text-sm font-semibold text-ink hover:border-gold-hi hover:text-gold-hi">
        Back to site
      </Link>
    </main>
  );
}
