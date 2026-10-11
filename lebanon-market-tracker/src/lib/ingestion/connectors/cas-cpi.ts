import ExcelJS from "exceljs";
import type { Connector, IndicatorRecord } from "../types";

/**
 * Central Administration of Statistics (CAS) — monthly Consumer Price Index workbook.
 * The CPI page links only the latest workbook (file name changes monthly), so the link is discovered
 * from the page on every run. Each workbook carries the current and previous month for Lebanon and six
 * regions, by expenditure division, plus the year-on-year change sheet. History accumulates over runs.
 */
const PAGE = "https://www.cas.gov.lb/economic-statistics/cpi/";

export type Cell = string | number | null;
type Raw = { workbookUrl: string; monthly: Cell[][]; yearly: Cell[][] };

export type CpiItem = {
  region: string; // CAS region label (English)
  division: string;
  divisionAr: string | null;
  measure: "index" | "yoy_pct" | "mom_pct";
  year: number;
  month: number;
  value: number;
  weight: number | null;
  imputed: boolean;
  workbookUrl: string;
};

const MONTHS: Record<string, number> = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12 };

export const CAS_REGIONS: Record<string, { code: string; areaKey: string; nameAr: string }> = {
  Lebanon: { code: "LBN", areaKey: "lebanon", nameAr: "لبنان" },
  Beirut: { code: "BEI", areaKey: "beirut", nameAr: "بيروت" },
  "Mount Lebanon": { code: "MTL", areaKey: "mount_lebanon", nameAr: "جبل لبنان" },
  North: { code: "NOR", areaKey: "north", nameAr: "الشمال" },
  Bekaa: { code: "BEK", areaKey: "beqaa", nameAr: "البقاع" },
  South: { code: "SOU", areaKey: "south", nameAr: "الجنوب" },
  Nabatieh: { code: "NAB", areaKey: "nabatieh", nameAr: "النبطية" },
};

function cellValue(v: ExcelJS.CellValue): Cell {
  if (v == null) return null;
  if (typeof v === "number" || typeof v === "string") return v;
  if (typeof v === "boolean") return String(v);
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "object") {
    if ("result" in v) return cellValue((v as ExcelJS.CellFormulaValue).result as ExcelJS.CellValue);
    if ("richText" in v) return (v as ExcelJS.CellRichTextValue).richText.map((t) => t.text).join("");
    if ("text" in v) return String((v as { text: unknown }).text);
  }
  return null;
}

function sheetGrid(ws: ExcelJS.Worksheet | undefined): Cell[][] {
  if (!ws) return [];
  const rows: Cell[][] = [];
  ws.eachRow({ includeEmpty: true }, (row, n) => {
    const vals = (row.values as ExcelJS.CellValue[]).slice(1).map(cellValue);
    rows[n - 1] = vals;
  });
  return Array.from(rows, (r) => r ?? []);
}

export function slug(s: string) {
  return s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

/** "Aug index 2026" / "*Jul index 2026" → {year, month} */
export function parseIndexHeader(s: Cell): { year: number; month: number } | null {
  if (typeof s !== "string") return null;
  const m = /([A-Za-z]{3,4})\w*\s+index\s+(\d{4})/i.exec(s.replace(/\*/g, "").trim());
  if (!m) return null;
  const month = MONTHS[m[1].toLowerCase()];
  return month ? { year: Number(m[2]), month } : null;
}

/** Interprets a CAS CPI sheet grid: region blocks, each with a header row and division rows. */
export function parseCpiGrid(grid: Cell[][], kind: "monthly" | "yearly", workbookUrl: string): { items: CpiItem[]; issues: string[] } {
  const items: CpiItem[] = [];
  const issues: string[] = [];
  let region: string | null = null;
  let cols: { cur: { year: number; month: number }; prev: { year: number; month: number }; weightCol: number; arCol: number; imputed: boolean } | null = null;
  for (const row of grid) {
    const a = typeof row[0] === "string" ? row[0].trim() : null;
    // exceljs repeats merged-cell values across the merge, so a region title may fill several cells.
    if (a && CAS_REGIONS[a] && row.slice(1, 5).every((c) => c == null || (typeof c === "string" && c.trim() === a))) {
      region = a;
      cols = null;
      continue;
    }
    if (a === "Expenditure Divisions") {
      const cur = parseIndexHeader(row[2]);
      const prev = parseIndexHeader(row[3]);
      if (!cur || !prev) {
        if (cols) continue; // second (Arabic) header line of the same block
        issues.push(`Unrecognized header in ${region ?? "?"}: ${JSON.stringify(row.slice(0, 5))}`);
        cols = null;
        continue;
      }
      // Regional blocks have an extra "Weight as % of Lebanon" column before "Weights".
      const weightIdx = row.findIndex((c) => typeof c === "string" && c.trim() === "Weights");
      if (cols) continue; // repeated header line (merged cells)
      cols = { cur, prev, weightCol: weightIdx, arCol: weightIdx + 1, imputed: String(row[2]).includes("*") };
      continue;
    }
    if (!region || !cols || !a || typeof row[2] !== "number") continue;
    const division = a.replace(/\s+/g, " ").trim();
    const divisionAr = typeof row[cols.arCol] === "string" ? String(row[cols.arCol]).trim() : null;
    const weight = typeof row[cols.weightCol] === "number" ? (row[cols.weightCol] as number) : null;
    const base = { region, division, divisionAr, weight, imputed: cols.imputed, workbookUrl };
    if (kind === "monthly") {
      items.push({ ...base, measure: "index", ...cols.cur, value: row[2] as number });
      if (typeof row[3] === "number") items.push({ ...base, measure: "index", ...cols.prev, value: row[3] as number });
      if (typeof row[1] === "number") items.push({ ...base, measure: "mom_pct", ...cols.cur, value: (row[1] as number) * 100 });
    } else {
      if (typeof row[1] === "number") items.push({ ...base, measure: "yoy_pct", ...cols.cur, value: (row[1] as number) * 100 });
      if (typeof row[3] === "number") items.push({ ...base, measure: "index", ...cols.prev, value: row[3] as number });
    }
  }
  return { items, issues };
}

export const casCpiConnector: Connector<Raw, CpiItem> = {
  id: "cas_cpi",
  requiresCredential: false,
  async fetch(ctx) {
    const page = await ctx.http.get(PAGE, { timeoutMs: 45_000, retries: 2 });
    if (/Just a moment|cf_chl/i.test(page.text.slice(0, 3000))) throw new Error("CAS returned a bot-protection challenge; not bypassing it");
    const links = [...page.text.matchAll(/href="(https:\/\/www\.cas\.gov\.lb\/wp-content\/uploads\/cpi\/[^"]+\.xlsx)"/gi)].map((m) => m[1]);
    if (!links.length) throw new Error("No CPI workbook link found on the CAS CPI page (page layout may have changed)");
    const workbookUrl = links[0];
    const res = await ctx.http.get(workbookUrl, { timeoutMs: 60_000, retries: 2 });
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(res.bytes.buffer.slice(res.bytes.byteOffset, res.bytes.byteOffset + res.bytes.byteLength) as ArrayBuffer);
    ctx.log.info("workbook downloaded", { url: workbookUrl, sheets: wb.worksheets.map((w) => w.name) });
    return {
      raw: { workbookUrl, monthly: sheetGrid(wb.getWorksheet("CPI_monthly")), yearly: sheetGrid(wb.getWorksheet("CPI_yearly")) },
      payloads: [{ url: workbookUrl, contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64", body: Buffer.from(res.bytes).toString("base64") }],
    };
  },
  validate(raw) {
    const m = parseCpiGrid(raw.monthly, "monthly", raw.workbookUrl);
    const y = parseCpiGrid(raw.yearly, "yearly", raw.workbookUrl);
    const issues = [...m.issues, ...y.issues].map((reason, index) => ({ index, reason }));
    if (!m.items.length) issues.push({ index: -1, reason: "CPI_monthly sheet yielded no values (layout changed?)" });
    const items = [...m.items, ...y.items].filter((i) => Number.isFinite(i.value) && i.year > 2000 && i.year < 2100);
    return { items, issues };
  },
  normalize(items) {
    // The yearly sheet repeats the previous-year index; prefer the monthly sheet when both exist.
    const out: IndicatorRecord[] = [];
    for (const i of items) {
      const reg = CAS_REGIONS[i.region];
      const isHeadline = i.division === "Consumer price index";
      const divKey = isHeadline ? "TOTAL" : slug(i.division).toUpperCase();
      const measureLabel = { index: "index (Dec 2013 = 100)", yoy_pct: "year-on-year change %", mom_pct: "month-on-month change %" }[i.measure];
      const measureAr = { index: "الرقم القياسي", yoy_pct: "التغير السنوي ٪", mom_pct: "التغير الشهري ٪" }[i.measure];
      const periodDate = `${i.year}-${String(i.month).padStart(2, "0")}-01`;
      out.push({
        kind: "indicator",
        indicator: {
          code: `CAS.CPI.${i.measure.toUpperCase()}.${reg.code}.${divKey}`,
          countryCode: "LBN",
          nameEn: `CPI ${measureLabel} — ${i.region} — ${i.division}`,
          nameAr: `${isHeadline ? "مؤشر أسعار الاستهلاك" : `أسعار الاستهلاك: ${i.divisionAr ?? i.division}`} — ${measureAr} — ${reg.nameAr}`,
          unit: i.measure === "index" ? "index, Dec 2013 = 100" : "%",
          unitAr: i.measure === "index" ? "رقم قياسي (كانون الأول 2013 = 100)" : "٪",
          frequency: "monthly",
          category: "prices",
          sectorKey: /rent|housing/i.test(i.division) ? "real_estate" : /food/i.test(i.division) ? "agriculture" : /transport/i.test(i.division) ? "transport" : /health/i.test(i.division) ? "healthcare" : /education/i.test(i.division) ? "education" : /communication/i.test(i.division) ? "telecom" : /restaurant/i.test(i.division) ? "tourism" : null,
          higherIs: i.measure === "index" ? "neutral" : "worse",
          methodologyUrl: "https://www.cas.gov.lb/economic-statistics/cpi/",
          metadata: { provider: "CAS", region: i.region, area_key: reg.areaKey, division: i.division, division_ar: i.divisionAr, measure: i.measure, headline: isHeadline, weight: i.weight },
        },
        periodDate,
        periodLabel: `${i.year}-${String(i.month).padStart(2, "0")}`,
        value: Math.round(i.value * 10000) / 10000,
        unit: i.measure === "index" ? "index" : "%",
        isProjection: false,
        observedAt: new Date(Date.UTC(i.year, i.month, 0, 23, 59, 59)),
        sourceUrl: i.workbookUrl,
        qualityStatus: i.imputed ? "provisional" : "ok",
        provenance: {
          workbook_url: i.workbookUrl,
          page_url: PAGE,
          ...(i.imputed ? { note: "CAS: index based on a majority of imputed prices", imputed: true } : {}),
        },
      });
    }
    return out;
  },
};
