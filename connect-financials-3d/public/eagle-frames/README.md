# public/eagle-frames/

Image-sequence eagle (the fallback, and the default on phones when present).

1. Generate a video of the eagle artwork going from wings closed to wings open
   (AI image-to-video), on a pure black/navy background.
2. Export ~150 frames as WebP: `0001.webp` … `0150.webp` (desktop, e.g. 2560 px wide)
   and optionally `mobile/0001.webp` … (e.g. 900 px wide).
3. Add `manifest.json`:

```json
{
  "count": 150,
  "pattern": "/eagle-frames/{index}.webp",
  "mobilePattern": "/eagle-frames/mobile/{index}.webp",
  "pad": 4,
  "width": 2560,
  "height": 1440
}
```

Preview it on any device with `?eagle=sequence`.
