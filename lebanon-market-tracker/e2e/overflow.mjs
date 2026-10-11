import { chromium } from "@playwright/test";
const base = process.argv[2] ?? "http://localhost:3000";
const path = process.argv[3] ?? "/";
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
await page.goto(`${base}/login`);
await page.fill('input[type="password"]', process.env.ADMIN_PASSWORD ?? "dev-password-change-me");
await Promise.all([page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 240000, waitUntil: "commit" }), page.click('button[type="submit"]')]);
await page.goto(base + path, { waitUntil: "networkidle", timeout: 240000 });
const res = await page.evaluate(() => {
  const vw = window.innerWidth;
  const out = [];
  for (const el of document.querySelectorAll("body *")) {
    const r = el.getBoundingClientRect();
    if (r.width > vw + 1 || r.left < -1) out.push(`${el.tagName}.${(el.className?.baseVal ?? el.className ?? "").toString().slice(0, 80)} w=${Math.round(r.width)} left=${Math.round(r.left)}`);
  }
  return out.slice(0, 15);
});
console.log(res.join("\n"));
await browser.close();
