"use client";
import { useState } from "react";
import { Lock } from "lucide-react";
import { Button, inputCls } from "@/components/ui";

export function LoginForm({ next }: { next: string }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(res.status === 429 ? "محاولات كثيرة. انتظر دقيقة ثم أعد المحاولة." : j.message ?? "تعذّر تسجيل الدخول");
      window.location.assign(next);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="space-y-3">
      <label className="block text-sm text-ink-2">
        كلمة المرور
        <input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className={`${inputCls} mt-1`} />
      </label>
      {error ? <p role="alert" className="text-xs text-rose">{error}</p> : null}
      <Button type="submit" variant="primary" className="w-full" disabled={busy}>
        <Lock className="size-4" /> {busy ? "جارٍ الدخول…" : "دخول"}
      </Button>
    </form>
  );
}
