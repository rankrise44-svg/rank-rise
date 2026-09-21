# Jack — 3D Creator (draft sample)

A one-page dark-theme portfolio concept built as a **draft sample** for
RankRise. It is self-contained: nothing in the main site imports from here,
and nothing here touches the site at the repo root.

- **Stack:** React 18 + TypeScript + Vite, Tailwind CSS 3, Framer Motion 12,
  Lucide React.
- **Type:** Kanit (Google Fonts, 300–900).
- **Palette:** `#0C0C0C` background, `#D7E2EA` text, a magenta→amber gradient
  on the contact pill, and a `#646973 → #BBCCD7` gradient on the headings.

## Look at it

The build is committed to `preview/`, so on the deployed site it is live at
**`/drafts/jack-3d-creator/preview/`** — no build step needed on Netlify.

Locally:

```bash
python3 -m http.server 8000      # from the repo root
# → http://localhost:8000/drafts/jack-3d-creator/preview/
```

## Work on it

```bash
cd drafts/jack-3d-creator
npm install
npm run dev        # hot-reloading dev server
npm run build      # typecheck + rebuild preview/
```

`npm run build` writes straight into `preview/`, so **commit that folder**
after a change or the published draft will lag behind the source.

## Layout

```
src/
  App.tsx                    section order + page wrapper
  index.css                  reset, #0C0C0C base, .hero-heading gradient
  components/
    FadeIn.tsx               whileInView fade/slide wrapper (once, 50px margin)
    Magnet.tsx               cursor-following magnetic transform
    AnimatedText.tsx         per-character scroll reveal (0.2 → 1 opacity)
    ContactButton.tsx        gradient pill, "Contact Me"
    LiveProjectButton.tsx    ghost pill, "Live Project"
  sections/
    HeroSection.tsx          nav, giant gradient headline, magnetic portrait
    MarqueeSection.tsx       two GIF rows driven by scroll position
    AboutSection.tsx         corner 3D props + animated paragraph
    ServicesSection.tsx      white panel, five numbered services
    ProjectsSection.tsx      three sticky cards that stack and scale down
```

## Notes for whoever picks this up

- **All imagery is hot-linked** to `motionsites.ai`, `figma.site` and
  `images.higgs.ai`. Fine for a draft; before anything ships, the art has to be
  replaced with assets we own and served from `assets/`.
- The copy is placeholder ("Jack", the five services, the three project names)
  and exists to show the layout, not to be read as RankRise content.
- The nav links point at in-page anchors only — there is no second page.
- Motion is scroll-driven throughout; `prefers-reduced-motion` is **not**
  honoured yet, which is worth fixing if this becomes more than a sample.
