// Usage: node e2e/screens.mjs [baseUrl] [outDir] [paths...]
// Logs in with ADMIN_PASSWORD and captures desktop + mobile screenshots, failing on console errors.
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
const base = process.argv[2] ?? "http://localhost:3000";
const out = process.argv[3] ?? "test-results/screens";
const paths = process.argv.slice(4).length ? process.argv.slice(4) : ["/"];
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM ?? undefined });
const problems = [];
for (const [name, viewport] of [["desktop", { width: 1536, height: 1000 }], ["mobile", { width: 390, height: 844 }]]) {
  const ctx = await browser.newContext({ viewport, locale: "ar-LB" });
  const page = await ctx.newPage();
  page.on("console", (m) => m.type() === "error" && problems.push(`${name} console: ${m.text().slice(0, 200)}`));
  page.on("pageerror", (e) => problems.push(`${name} pageerror: ${e.message.slice(0, 200)}`));
  await page.goto(`${base}/login`);
  await page.fill('input[type="password"]', process.env.ADMIN_PASSWORD ?? "dev-password-change-me");
  await Promise.all([page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 240000, waitUntil: "commit" }), page.click('button[type="submit"]')]);
  for (const p of paths) {
    await page.goto(`${base}${p}`, { waitUntil: "networkidle", timeout: 240000 });
    await page.waitForTimeout(1500);
    const file = `${out}/${name}${p === "/" ? "-home" : p.replace(/[/?=&]/g, "-")}.png`;
    await page.screenshot({ path: file, fullPage: true });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (overflow > 2) problems.push(`${name} ${p}: horizontal overflow ${overflow}px`);
    console.log("saved", file);
  }
  await ctx.close();
}
await browser.close();
if (problems.length) {
  console.log("PROBLEMS:\n" + problems.join("\n"));
  process.exitCode = 1;
}
