export const NAV = [
  { href: "/", label: "الرئيسية", en: "Dashboard", icon: "LayoutDashboard" },
  { href: "/news", label: "الأخبار والأحداث", en: "News & events", icon: "Newspaper" },
  { href: "/markets", label: "الأسواق المالية", en: "Financial markets", icon: "CandlestickChart" },
  { href: "/economy", label: "الاقتصاد اللبناني", en: "Lebanese economy", icon: "Landmark" },
  { href: "/sectors", label: "الشركات والقطاعات", en: "Companies & sectors", icon: "Building2" },
  { href: "/real-estate", label: "العقارات", en: "Real estate", icon: "House" },
  { href: "/jobs", label: "الوظائف", en: "Employment", icon: "Briefcase" },
  { href: "/fx-gold", label: "العملات والذهب", en: "Currencies & gold", icon: "Coins" },
  { href: "/trends", label: "الاتجاهات", en: "Trends", icon: "TrendingUp" },
  { href: "/opportunities", label: "الفرص الاستثمارية والتجارية", en: "Opportunities", icon: "Lightbulb" },
  { href: "/analytics", label: "التحليلات والتوقعات", en: "Analytics & forecasts", icon: "LineChart" },
  { href: "/assistant", label: "المحادثة الذكية", en: "AI assistant", icon: "Bot" },
  { href: "/reports", label: "التقارير", en: "Reports", icon: "FileText" },
  { href: "/sources", label: "المصادر والبيانات", en: "Sources & data", icon: "Database" },
  { href: "/settings", label: "الإعدادات", en: "Settings", icon: "Settings" },
] as const;

export const TOPIC_LABELS: Record<string, string> = {
  economy: "الاقتصاد", currency: "العملة وسعر الصرف", inflation: "التضخم والأسعار", fiscal: "المالية العامة", reforms_imf: "الإصلاحات وصندوق النقد",
  politics: "السياسة", security: "الأمن والنزاعات", aid: "المساعدات والتمويل", regional: "الإقليم", business: "الأعمال والشركات",
};

export const SECTOR_LABELS: Record<string, string> = {
  banking: "المصارف والخدمات المالية", real_estate: "العقارات والبناء", tourism: "السياحة والضيافة", retail: "التجزئة والسلع الاستهلاكية",
  agriculture: "الزراعة والغذاء", energy: "الطاقة والطاقة الشمسية", telecom: "الاتصالات والتكنولوجيا", software_ai: "البرمجيات والذكاء الاصطناعي",
  healthcare: "الرعاية الصحية", education: "التعليم", transport: "النقل والخدمات اللوجستية", trade: "الاستيراد والتصدير", manufacturing: "الصناعة التحويلية",
  professional_services: "الخدمات المهنية", marketing: "الإعلان والتسويق", employment: "التوظيف وسوق العمل", public_procurement: "المشتريات العامة والبنى التحتية",
};

export const AREA_LABELS: Record<string, string> = {
  lebanon: "لبنان", beirut: "بيروت", mount_lebanon: "جبل لبنان", keserwan_jbeil: "كسروان-جبيل", north: "الشمال", akkar: "عكار", beqaa: "البقاع",
  baalbek_hermel: "بعلبك-الهرمل", south: "الجنوب", nabatieh: "النبطية",
};

export const IMPACT_LABELS: Record<string, { label: string; tone: "emerald" | "rose" | "amber" | "neutral" | "violet" }> = {
  positive: { label: "أثر إيجابي محتمل", tone: "emerald" },
  negative: { label: "أثر سلبي محتمل", tone: "rose" },
  mixed: { label: "أثر مختلط", tone: "amber" },
  uncertain: { label: "أثر غير مؤكد", tone: "violet" },
  neutral: { label: "محايد", tone: "neutral" },
};
