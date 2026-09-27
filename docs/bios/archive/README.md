# BIOS archive

`prototype-pre-redesign/` is the BIOS prototype exactly as it was live at
https://claude.ai/artifact/LErxwhHc1vFf3Ge8kqBiBY before the Command Center
redesign was published (artifact version `1790330831-d292`; all 27 files
checked byte-for-byte against the live copy before archiving).

The live source is now `docs/bios/redesign/`.

## Rollback

To put the old design back live, republish this folder to the same artifact:
the page is `prototype-pre-redesign/index.html`, and every file under `css/`
and `js/` is published at the same relative path, with the `sample`
capability. The artifact's own version history also keeps the previous
version.
