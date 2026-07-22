# RankRise — Website & Portfolio

The **RankRise agency website is the main site** (`index.html`). Its **Portfolio**
section showcases client case-study projects; **clicking a project opens it
full-screen** with a **← Back to RankRise** button (`Esc` also closes).

## Structure

```
index.html          →  the full RankRise agency website (main site)
projects/
  mariam-jammoul-branding.html        →  Mariam Jammoul — brand identity
  farhat-services-case-study.html     →  Farhat Services — case study
  deir-qanoun-sorting-campaign.html   →  #ضروري_نكفّي — Deir Qanoun El Nahr campaign
```

## How the portfolio works

- The Portfolio section is driven by the `data` array inside `index.html`.
- Each entry with a `link` becomes a clickable card; clicking it opens that
  project in a full-screen `<iframe>` viewer — the project files are loaded
  as-is and never modified.
- You can also manage cards from the site's built-in **Dashboard** (top-right
  nav) — note that projects added there are display-only and won't have a link
  unless you add one in the `data` array.

## ➕ Adding a new portfolio project

1. Put the project's HTML file in `projects/`, e.g. `projects/new-project.html`.
2. In `index.html`, find the `data` array and add an entry:

   ```js
   {
     id: 4,
     title: 'New Project — Short Result',
     client: 'Client Name',
     cat: 'Brand',                 // SEO | Paid | Brand | Social | Prod (drives the filter)
     mLabel: 'Case Study',
     mVal: 'Open ↗',
     size: 'third',                // wide (7 cols) | normal (5) | third (4)
     grad: GRADS[2],               // background gradient (GRADS array above)
     link: 'projects/new-project.html'
   },
   ```

3. Save. The card appears in the Portfolio grid and opens full-screen on click.

## Running locally

The portfolio viewer loads project files via `<iframe>`, so open the site
through a local web server (not `file://`):

```bash
python3 -m http.server 8000
# then visit http://localhost:8000/
```
