import { normalizeText } from "../ingestion/normalize";
import { AREAS } from "./lexicon";

/** Maps a governorate/district name in any spelling (EN/FR/AR) to our area key. */
export function matchAreaKey(name: string | null | undefined): string | null {
  if (!name) return null;
  const n = normalizeText(name).replace(/^(el|al|ال) /, "");
  for (const a of AREAS) {
    const names = [a.name_en, a.name_ar, a.key.replace(/_/g, " "), ...a.aliases].map((x) => normalizeText(x).replace(/^(el|al|ال) /, ""));
    if (names.includes(n)) return a.key;
  }
  const extra: Record<string, string> = {
    "mont liban": "mount_lebanon", "liban nord": "north", "nord": "north", "liban sud": "south", "sud": "south", "bekaa": "beqaa", "beqaa": "beqaa",
    "nabatiye": "nabatieh", "nabatiyeh": "nabatieh", "baalbek el hermel": "baalbek_hermel", "baalbek hermel": "baalbek_hermel", "baalbek": "baalbek_hermel",
    "aakar": "akkar", "keserwan jbeil": "keserwan_jbeil", "kesrouane jbeil": "keserwan_jbeil", "keserouan jbeil": "keserwan_jbeil", "beyrouth": "beirut",
  };
  return extra[n] ?? null;
}
