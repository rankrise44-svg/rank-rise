# RankRise — Portfolio

A portfolio hub that showcases live websites/projects. Each project appears as a
card; **clicking a card opens that site full-screen** with a floating
**← Back to Portfolio** button. Designed so you can **add more projects in the
future** by editing a single list.

## Structure

```
index.html              →  the portfolio hub (grid of project cards + viewer)
projects/
  rankrise.html         →  the RankRise agency website (kept 100% unchanged)
```

## How it works

- The hub reads a `PROJECTS` list in `index.html` and builds a card for each one.
- Each card shows a **live scaled preview** of the real site.
- Clicking a card loads the project in a full-screen `<iframe>` overlay — the
  original project files are never modified, so any site works as-is.
- **Esc** or the **← Back to Portfolio** button returns to the grid.

## ➕ Adding a new project (future work)

1. Put the new site's HTML file in the repo, e.g. `projects/my-new-site.html`.
2. Open `index.html`, find the `PROJECTS` list near the bottom, and add a block:

   ```js
   {
     url: "projects/my-new-site.html",
     title: "My New Site",
     cat: "Landing Page",
     desc: "One-line description of the project.",
     tags: ["Tag One", "Tag Two"],
     preview: true   // live preview thumbnail; set false to show the logo placeholder
   },
   ```

3. Save. The card, live preview, and full-screen viewer are generated
   automatically — no other changes needed.

## Running locally

Because the hub loads project files via `<iframe>`, open it through a local
web server (not `file://`) so previews load correctly:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000/
```
