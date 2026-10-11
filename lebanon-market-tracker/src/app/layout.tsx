import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Lebanon Market Tracker — منصة استخبارات الأسواق اللبنانية", template: "%s · Lebanon Market Tracker" },
  description: "منصة شخصية لرصد الاقتصاد والأسواق والأخبار في لبنان، مع مصادر موثّقة وتواريخ لكل رقم.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#060a13", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body className="min-h-dvh antialiased">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:right-2 focus:z-[2000] focus:rounded-lg focus:bg-cyan focus:px-3 focus:py-2 focus:text-bg">
          انتقل إلى المحتوى
        </a>
        {children}
      </body>
    </html>
  );
}
