# RankRise — Website & Portfolio

A professional, mobile-first agency website. The homepage leads with the
**Work / portfolio**; clicking any project opens it full-screen.

## Structure

```
index.html          →  the website (design + layout)
projects.js         →  ★ your portfolio DATA — edit this to manage projects
assets/covers/      →  project cover images
projects/           →  the case-study pages that open on click
robots.txt, sitemap.xml, netlify.toml   →  hosting / SEO
```

## ✏️ Managing projects — edit ONE file: `projects.js`

All portfolio data lives in **`projects.js`**, separate from the design. Each
project is one line:

```js
window.RANKRISE_PROJECTS = [
  { id: 8, title: 'New Client — Project', client: 'New Client',
    cat: 'Brand', size: 'normal', mLabel: 'Case Study',
    cover: 'assets/covers/new.jpg', link: 'projects/new.html' },
  …
];
```

Fields: `cat` = Brand | Social | Prod | Paid | SEO (drives the filter) ·
`size` = `normal` or `feat` (featured = full-width) · `link` = a file in
`projects/` or a full `https://` URL · `cover` = an image in `assets/covers/`
or an `https://` URL.

**To add a project:** drop its `.html` in `projects/` and a cover in
`assets/covers/`, then add one line to `projects.js`. Done.

### Or use the built-in manager (no code)
Open the site with **`#admin`** in the URL (or press **Ctrl/Cmd + Alt + A**) to
add/edit/remove projects visually. Changes preview instantly and save on your
device; hit **“Copy code to publish”** and paste the result into `projects.js`
to make them live for everyone.

## 📋 Client discovery form — `blue-brief.html`

An RTL Arabic, 11-step questionnaire you send to a client; their answers come
back to you automatically. Live at **`https://rankrise.media/blue-brief.html`**
(unlisted — not linked from the site, `noindex`, blocked in `robots.txt`).

It posts to **Netlify Forms**, so there is no server to run. Two things to do
once, in the Netlify dashboard:

1. **Deploy, then check detection** — *Site configuration → Forms*. A form
   named **`blue-brief`** should appear after the first deploy. Netlify parses
   the deployed HTML, so every question must exist as a real `<input>` in the
   file — that's why the page is plain static markup rather than JS-rendered.
2. **Turn on the email** — *Forms → Form notifications → Add notification →
   Email notification*, pick the `blue-brief` form, and send it to your
   address. Every submission then lands in your inbox **and** stays in the
   Netlify dashboard as a backup.

Each submission carries every question as its own field, plus a field called
**`ملخص الأجوبة`** — the whole thing as readable Arabic “question → answer”
text, which is the one to read first.

Free tier covers 100 submissions/month. Answers autosave in the client's
browser as they type, so they can close the tab and come back.

Optional: to switch on the WhatsApp fallback button (shown only if the POST
fails), set `OWNER_WHATSAPP` near the top of the `<script>` in
`blue-brief.html` to your number, e.g. `'963999111222'`.

## Running locally

The site loads `projects.js` and opens projects via `<iframe>`, so serve it
through a local web server (not `file://`):

```bash
python3 -m http.server 8000    # then open http://localhost:8000/
```
