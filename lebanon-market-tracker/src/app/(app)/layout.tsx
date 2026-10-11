import { Header } from "@/components/shell/Header";
import { Sidebar } from "@/components/shell/Sidebar";
import { getSettings } from "@/lib/settings";
import { Notice } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings();
  return (
    <div className="flex min-h-dvh">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        <main id="main" className="mx-auto w-full max-w-[1600px] flex-1 px-3 py-4 md:px-5 md:py-5">
          {settings.demoMode ? (
            <div className="mb-4">
              <Notice tone="violet">
                وضع العرض التجريبي مفعّل (بيئة التطوير فقط): قد تظهر بيانات اصطناعية مُعلَّمة بشارة «بيانات تجريبية». لا تعتمد عليها.
              </Notice>
            </div>
          ) : null}
          {children}
        </main>
        <footer className="no-print border-t border-line px-5 py-3 text-[11px] text-faint">
          Lebanon Market Tracker · البيانات من مصادرها المذكورة؛ الاستنتاجات الآلية والتوقعات ليست يقيناً ولا نصيحة استثمارية.
        </footer>
      </div>
    </div>
  );
}
