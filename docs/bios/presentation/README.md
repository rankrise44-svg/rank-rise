# RISER product explainer video

`riser-explainer.html` is a 1920×1080, 112-second animated walkthrough of the
product side, from a customer's point of view: sign in → company information →
company brain → 19 agents → Ask → maps → plan and execute (with approval) →
evaluation → Hermus → the Understand/Plan/Act/Learn loop. Sample data only.

It is driven by `window.seek(t)`, so every frame is deterministic. Open it in a
browser and call `seek(30)` in the console to preview any moment.

Render to MP4 (Playwright + ffmpeg):

    FF=/path/to/ffmpeg FONTS=/path/to/fonts node render-explainer.js out.mp4 30

`FONTS` is a folder with the Google Fonts CSS for Anton + Manrope saved as
`css.css`, its font URLs rewritten to local `f1.ttf`, `f2.ttf`, … files.
Rendered videos are not committed.
