import { XMLParser } from "fast-xml-parser";
import { detectLanguage, parseDateLoose, toExcerpt } from "../normalize";
import type { ValidationIssue, Connector, NewsRecord } from "../types";

/** Generic RSS 2.0 / Atom / RSS 1.0 (RDF) ingestion. Stores title, link, date and a short excerpt only. */
type Item = {
  title: string;
  link: string;
  guid?: string;
  date?: string;
  summary?: string;
  image?: string;
  feedTitle?: string;
};
type Raw = { url: string; xml: string };

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
  processEntities: true,
  htmlEntities: true,
  // Defends against entity-expansion payloads in hostile feeds.
  ignoreDeclaration: true,
  ignorePiTags: true,
});

function text(v: unknown): string | undefined {
  if (v == null) return undefined;
  if (typeof v === "string" || typeof v === "number") return String(v);
  if (Array.isArray(v)) return text(v[0]);
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    return text(o["#text"] ?? o["@_href"]);
  }
  return undefined;
}

function asArray<T>(v: T | T[] | undefined): T[] {
  return v == null ? [] : Array.isArray(v) ? v : [v];
}

function atomLink(v: unknown): string | undefined {
  const links = asArray(v as Record<string, string> | Record<string, string>[]);
  const alt = links.find((l) => typeof l === "object" && (!l["@_rel"] || l["@_rel"] === "alternate")) ?? links[0];
  return typeof alt === "string" ? alt : alt?.["@_href"];
}

export function parseFeed(xml: string): { feedTitle?: string; items: Item[] } {
  const doc = parser.parse(xml.trimStart());
  if (doc?.rss?.channel) {
    const ch = Array.isArray(doc.rss.channel) ? doc.rss.channel[0] : doc.rss.channel;
    return {
      feedTitle: text(ch.title),
      items: asArray(ch.item).map((it: Record<string, unknown>) => ({
        title: text(it.title) ?? "",
        link: text(it.link) ?? text(it.guid) ?? "",
        guid: text(it.guid),
        date: text(it.pubDate) ?? text(it["dc:date"]),
        summary: text(it.description) ?? text(it["content:encoded"]),
        image: (it.enclosure as Record<string, string>)?.["@_url"] ?? (it["media:content"] as Record<string, string>)?.["@_url"] ?? (it["media:thumbnail"] as Record<string, string>)?.["@_url"],
      })),
    };
  }
  if (doc?.feed) {
    return {
      feedTitle: text(doc.feed.title),
      items: asArray(doc.feed.entry).map((e: Record<string, unknown>) => ({
        title: text(e.title) ?? "",
        link: atomLink(e.link) ?? "",
        guid: text(e.id),
        date: text(e.published) ?? text(e.updated),
        summary: text(e.summary) ?? text(e.content),
      })),
    };
  }
  if (doc?.["rdf:RDF"]) {
    const rdf = doc["rdf:RDF"];
    return {
      feedTitle: text(rdf.channel?.title),
      items: asArray(rdf.item).map((it: Record<string, unknown>) => ({
        title: text(it.title) ?? "",
        link: text(it.link) ?? "",
        date: text(it["dc:date"]),
        summary: text(it.description),
      })),
    };
  }
  throw new Error("Not a recognizable RSS/Atom document");
}

export const rssConnector: Connector<Raw, Item> = {
  id: "rss",
  requiresCredential: false,
  async fetch(ctx) {
    const url = ctx.source.endpoint_url;
    if (!url) throw new Error("RSS source has no feed URL configured");
    const res = await ctx.http.get(url, {
      timeoutMs: 25_000,
      retries: 2,
      minIntervalMs: 1_000,
      headers: { Accept: "application/rss+xml, application/atom+xml, application/xml;q=0.9, text/xml;q=0.8" },
    });
    if (/<html[\s>]/i.test(res.text.slice(0, 500)) && !/<(rss|feed|rdf:RDF)[\s>]/i.test(res.text.slice(0, 2000))) {
      throw new Error("The URL returned an HTML page instead of a feed (possibly a bot-protection page)");
    }
    return { raw: { url, xml: res.text }, payloads: [{ url, contentType: res.contentType, body: res.text }] };
  },
  validate(raw) {
    const { feedTitle, items } = parseFeed(raw.xml);
    const ok: Item[] = [];
    const issues: ValidationIssue[] = [];
    items.forEach((it, index) => {
      if (!it.title.trim()) return issues.push({ index, reason: "item without title" });
      try {
        const u = new URL(it.link.trim(), raw.url);
        if (!/^https?:$/.test(u.protocol)) return issues.push({ index, reason: "non-http link" });
        ok.push({ ...it, link: u.toString(), feedTitle });
      } catch {
        issues.push({ index, reason: "invalid link", sample: it.link.slice(0, 120) });
      }
    });
    return { items: ok, issues };
  },
  normalize(items, ctx) {
    const domain = ctx.source.domain;
    return items.map<NewsRecord>((it) => {
      const title = toExcerpt(it.title, 300) ?? it.title;
      const summary = toExcerpt(it.summary, 400);
      return {
        kind: "news",
        externalId: it.guid ?? null,
        url: it.link,
        title,
        summary,
        language: ctx.source.language ?? detectLanguage(title) ?? detectLanguage(summary ?? ""),
        sourceName: ctx.source.name,
        sourceDomain: domain ?? new URL(it.link).hostname,
        sourceCountry: (ctx.source.config as { country?: string }).country ?? null,
        imageUrl: it.image?.startsWith("https://") ? it.image : null,
        publishedAt: parseDateLoose(it.date, ctx.now),
        provenance: { via: "rss", feed_url: ctx.source.endpoint_url, feed_title: it.feedTitle ?? null, raw_date: it.date ?? null, time_semantics: "publisher_pubdate" },
      };
    });
  },
};
