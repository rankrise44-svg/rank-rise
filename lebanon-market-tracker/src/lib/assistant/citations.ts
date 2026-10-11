export type Citation = { id: string; title: string; url: string | null; source: string; date: string | null; kind: "news" | "indicator" | "market" | "price" | "signal" | "forecast" | "document" | "event" };

/** Server-side registry: the model can only cite IDs that a tool actually returned. */
export class CitationRegistry {
  private items = new Map<string, Citation>();
  private keys = new Map<string, string>();
  add(c: Omit<Citation, "id">, key: string): string {
    const existing = this.keys.get(key);
    if (existing) return existing;
    const id = String(this.items.size + 1);
    this.items.set(id, { ...c, id });
    this.keys.set(key, id);
    return id;
  }
  get(id: string) {
    return this.items.get(id);
  }
  all() {
    return [...this.items.values()];
  }
  /** Keeps only citation markers that exist; returns cleaned text and the cited subset. */
  validate(text: string): { text: string; cited: Citation[]; invalid: string[] } {
    const cited = new Set<string>();
    const invalid: string[] = [];
    const cleaned = text.replace(/\[(\d{1,3})\]/g, (m, id: string) => {
      if (this.items.has(id)) {
        cited.add(id);
        return m;
      }
      invalid.push(id);
      return "[؟]";
    });
    return { text: cleaned, cited: [...cited].map((id) => this.items.get(id)!).sort((a, b) => Number(a.id) - Number(b.id)), invalid };
  }
}
