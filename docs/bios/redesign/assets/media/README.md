# Website background media

Used only by the Website view (`js/site-video.js`, `.w-bg` in `js/screens/site.js`).

| File | What |
|---|---|
| `part1.mp4` | Part 1 (5s): fibers fan out, cross into an X |
| `part2.mp4` | Part 2 (8s): straighten into diagonals, curl into a ribbon |
| `still-fan.jpg`, `still-x.jpg`, `still-ribbon.jpg` | Fallback stills shown under the videos |

`part1-src.mp4` / `part2-src.mp4` are the original downloads; run `sh encode.sh`
to produce the scrub-friendly `part1.mp4` / `part2.mp4` (a keyframe on every frame).
