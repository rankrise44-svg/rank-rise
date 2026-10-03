# RankRise: "Launch to the Moon" ad (prototype)

A vertical (9:16) brand short for YouTube Shorts, Reels and TikTok. A pilot counts down 3-2-1 inside the cockpit, the crew launches through the clouds, the moon fills the window, the crew lands and celebrates, and the camera cranes up to the ship. The ship is the chrome RR logo, and the spot ends on the real logo spin: **RANK RISE / YOU RISE.**

## Files

| File | What it is |
|---|---|
| `out/rankrise_launch_prototype.mp4` | 22.5s animatic with countdown, shake, text and sound design |
| `storyboard.jpg` | The 5 keyframes side by side |
| `keyframes/*.png` | Higgsfield keyframes (GPT Image 2.5, logo used as a reference) |
| `assets/rr_logo_spin.mp4` | Original RR logo spin, used as the end card |
| `build.sh` | Rebuilds the animatic from the keyframes (ffmpeg) |

## Shot list

| # | Time | Shot | On screen | Sound |
|---|---|---|---|---|
| 1 | 0:00–0:05 | Cockpit, pilot at the throttle, crew behind | 3 · 2 · 1 · IGNITION | Countdown beeps |
| 2 | 0:05–0:08 | POV liftoff, clouds rushing, sky going black, heavy shake | (LIFTOFF on dash) | Rocket rumble |
| 3 | 0:08–0:11 | Zero-g, crew silhouettes, the moon fills the window | DESTINATION: #1 | Space drone |
| 4 | 0:11–0:14 | Crew on the moon, cheering, Earth in sky | WE MADE IT. | |
| 5 | 0:14–0:18 | Crane up from crew to the chrome RR-shaped ship | RANK RISE | |
| 6 | 0:18–0:22 | Real logo spin end card | RANK RISE / YOU RISE. | Bass hit |

## Full AI-video version (Higgsfield)

Animate each keyframe with **Kling 3.0** (image-to-video, `start_image` = the keyframe job ID, 9:16, 5s), then cut them together with `build.sh`-style transitions.

| Option | Cost per 5s shot | 5 shots |
|---|---|---|
| Kling 3.0 std, silent | 7.5 credits | 37.5 |
| Kling 3.0 std, with sound | 10 | 50 |
| Kling 3.0 pro, with sound | 12.5 | 62.5 |

Keyframe job IDs (use as `start_image`):

1. `481a39cf-6b32-4f1c-af10-486e69cae6a7` (cockpit)
2. `6f546154-557a-49bd-9295-41b8da264ef9` (liftoff)
3. `26e318fd-cdd3-439b-b0e1-61d0b45da4a2` (moon approach)
4. `943aa38b-cbb9-4139-9f40-5d8ed70ac2dd` (we made it)
5. `1c0e83e9-87f2-403c-9879-a87964cd958d` (RR ship reveal)

Motion prompts:

1. *Slow push-in on the pilot, cockpit lights pulsing violet, the dashboard counter changes 3, 2, 1, the pilot exhales and grips the throttle, the cabin begins to vibrate.*
2. *Violent camera shake, the pilot's hands push the throttle forward, clouds rush down past the window and the sky turns from blue to black space, lens flare.*
3. *Weightless calm, the crew drifts slightly, the moon grows larger in the window, slow push toward the glass.*
4. *The astronauts jump and cheer in low gravity, moon dust floats up slowly, Earth hangs in the sky, slight handheld feel.*
5. *Camera starts low behind the astronauts and cranes up the chrome RR-shaped ship to its tip, the violet thruster glows and pulses, dust drifts.*
