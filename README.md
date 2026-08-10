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

## Running locally

The site loads `projects.js` and opens projects via `<iframe>`, so serve it
through a local web server (not `file://`):

```bash
python3 -m http.server 8000    # then open http://localhost:8000/
```
