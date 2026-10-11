import { Logo } from "@/components/shell/Logo";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "تسجيل الدخول" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; setup?: string }> }) {
  const sp = await searchParams;
  const next = sp.next && sp.next.startsWith("/") && !sp.next.startsWith("//") ? sp.next : "/";
  return (
    <main id="main" className="grid min-h-dvh place-items-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-panel/90 p-6 shadow-2xl">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>
        {sp.setup ? (
          <p className="mb-4 rounded-lg border border-amber/30 bg-amber/10 p-3 text-xs leading-relaxed text-amber">
            المصادقة غير مُعدّة بعد. عيّن المتغيرين SESSION_SECRET و ADMIN_PASSWORD في ملف البيئة ثم أعد تشغيل الخادم (راجع README).
          </p>
        ) : null}
        <LoginForm next={next} />
        <p className="mt-6 text-center text-[11px] text-faint">منصة شخصية — الوصول مقتصر على المالك.</p>
      </div>
    </main>
  );
}
