# public/models/

Drop the real eagle here as **`eagle.glb`**. The site picks it up automatically
(no code change); until then it shows the built-in placeholder eagle.

Contract (see `src/scene/eagle/GlbEagle.tsx`):
- Rigged eagle, Draco or meshopt compressed, textures as KTX2.
- One clip named `WingsOpen`: frame 0 = wings folded, last frame = fully spread.
  Scroll scrubs this clip.
- Mesh names containing `eye`, `beak`, `claw`, `talon`/`toe`/`leg`, `head`,
  `feather`/`wing` get the matching look; everything else is body. Feathers need
  UVs (u across the vane, v base → tip) for barring and gold fringes.
- Optional empties `anchor_trade`, `anchor_accounts`, `anchor_platforms`,
  `anchor_tools`, `anchor_about`, `anchor_open-account` parented to wing bones
  so the menu follows the wings exactly.
