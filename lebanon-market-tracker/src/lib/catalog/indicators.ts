/** Curated indicator metadata (Arabic labels, units, interpretation). Codes are the providers' own. */
export type IndicatorCatalogEntry = {
  code: string;
  nameAr: string;
  unitAr: string;
  unit: string;
  category: "growth" | "prices" | "external" | "labour" | "fiscal" | "monetary" | "social" | "structure" | "tourism";
  higherIs: "better" | "worse" | "neutral";
  sectorKey?: string;
};

export const WORLD_BANK_INDICATORS: IndicatorCatalogEntry[] = [
  { code: "NY.GDP.MKTP.CD", nameAr: "الناتج المحلي الإجمالي (بالدولار الجاري)", unit: "current US$", unitAr: "دولار أميركي جاري", category: "growth", higherIs: "better" },
  { code: "NY.GDP.MKTP.KD.ZG", nameAr: "نمو الناتج المحلي الإجمالي الحقيقي", unit: "annual %", unitAr: "٪ سنوي", category: "growth", higherIs: "better" },
  { code: "NY.GDP.PCAP.CD", nameAr: "نصيب الفرد من الناتج المحلي", unit: "current US$", unitAr: "دولار أميركي جاري", category: "growth", higherIs: "better" },
  { code: "FP.CPI.TOTL.ZG", nameAr: "التضخم (أسعار المستهلك)", unit: "annual %", unitAr: "٪ سنوي", category: "prices", higherIs: "worse" },
  { code: "PA.NUS.FCRF", nameAr: "سعر الصرف الرسمي (ليرة لكل دولار، متوسط الفترة)", unit: "LCU per US$, period average", unitAr: "ليرة لبنانية لكل دولار", category: "monetary", higherIs: "neutral" },
  { code: "SL.UEM.TOTL.ZS", nameAr: "البطالة (تقدير منظمة العمل الدولية)", unit: "% of labour force, modeled ILO estimate", unitAr: "٪ من القوى العاملة", category: "labour", higherIs: "worse", sectorKey: "employment" },
  { code: "BX.TRF.PWKR.DT.GD.ZS", nameAr: "تحويلات المغتربين", unit: "% of GDP", unitAr: "٪ من الناتج", category: "external", higherIs: "neutral" },
  { code: "NE.IMP.GNFS.ZS", nameAr: "الواردات من السلع والخدمات", unit: "% of GDP", unitAr: "٪ من الناتج", category: "external", higherIs: "neutral", sectorKey: "trade" },
  { code: "NE.EXP.GNFS.ZS", nameAr: "الصادرات من السلع والخدمات", unit: "% of GDP", unitAr: "٪ من الناتج", category: "external", higherIs: "better", sectorKey: "trade" },
  { code: "BN.CAB.XOKA.GD.ZS", nameAr: "رصيد الحساب الجاري", unit: "% of GDP", unitAr: "٪ من الناتج", category: "external", higherIs: "better" },
  { code: "BX.KLT.DINV.CD.WD", nameAr: "صافي تدفقات الاستثمار الأجنبي المباشر", unit: "BoP, current US$", unitAr: "دولار أميركي جاري", category: "external", higherIs: "better" },
  { code: "ST.INT.ARVL", nameAr: "عدد السياح الوافدين", unit: "number of arrivals", unitAr: "عدد الوافدين", category: "tourism", higherIs: "better", sectorKey: "tourism" },
  { code: "GC.DOD.TOTL.GD.ZS", nameAr: "دين الحكومة المركزية", unit: "% of GDP", unitAr: "٪ من الناتج", category: "fiscal", higherIs: "worse" },
  { code: "FI.RES.TOTL.CD", nameAr: "إجمالي الاحتياطيات (مع الذهب)", unit: "current US$", unitAr: "دولار أميركي جاري", category: "monetary", higherIs: "better", sectorKey: "banking" },
  { code: "NV.AGR.TOTL.ZS", nameAr: "القيمة المضافة للزراعة", unit: "% of GDP", unitAr: "٪ من الناتج", category: "structure", higherIs: "neutral", sectorKey: "agriculture" },
  { code: "NV.IND.MANF.ZS", nameAr: "القيمة المضافة للصناعة التحويلية", unit: "% of GDP", unitAr: "٪ من الناتج", category: "structure", higherIs: "neutral", sectorKey: "manufacturing" },
  { code: "EG.ELC.ACCS.ZS", nameAr: "الوصول إلى الكهرباء", unit: "% of population", unitAr: "٪ من السكان", category: "social", higherIs: "better", sectorKey: "energy" },
  { code: "IT.NET.USER.ZS", nameAr: "مستخدمو الإنترنت", unit: "% of population", unitAr: "٪ من السكان", category: "social", higherIs: "better", sectorKey: "telecom" },
  { code: "SP.POP.TOTL", nameAr: "عدد السكان", unit: "people", unitAr: "نسمة", category: "social", higherIs: "neutral" },
];

export const IMF_INDICATORS: IndicatorCatalogEntry[] = [
  { code: "NGDP_RPCH", nameAr: "نمو الناتج الحقيقي (صندوق النقد)", unit: "annual % change", unitAr: "٪ سنوي", category: "growth", higherIs: "better" },
  { code: "PCPIPCH", nameAr: "التضخم، متوسط أسعار المستهلك (صندوق النقد)", unit: "annual % change", unitAr: "٪ سنوي", category: "prices", higherIs: "worse" },
  { code: "LUR", nameAr: "معدل البطالة (صندوق النقد)", unit: "% of labour force", unitAr: "٪ من القوى العاملة", category: "labour", higherIs: "worse", sectorKey: "employment" },
  { code: "BCA_NGDPD", nameAr: "رصيد الحساب الجاري (صندوق النقد)", unit: "% of GDP", unitAr: "٪ من الناتج", category: "external", higherIs: "better" },
  { code: "GGXWDG_NGDP", nameAr: "الدين الحكومي العام الإجمالي (صندوق النقد)", unit: "% of GDP", unitAr: "٪ من الناتج", category: "fiscal", higherIs: "worse" },
  { code: "NGDPD", nameAr: "الناتج المحلي الإجمالي بالأسعار الجارية (صندوق النقد)", unit: "billions of US$", unitAr: "مليار دولار", category: "growth", higherIs: "better" },
];

export const COUNTRY_NAMES_AR: Record<string, string> = {
  LBN: "لبنان", JOR: "الأردن", EGY: "مصر", CYP: "قبرص", SYR: "سوريا", TUR: "تركيا", ARE: "الإمارات", SAU: "السعودية", WLD: "العالم",
};

export function catalogEntry(provider: "worldbank" | "imf", code: string): IndicatorCatalogEntry | undefined {
  return (provider === "worldbank" ? WORLD_BANK_INDICATORS : IMF_INDICATORS).find((i) => i.code === code);
}
