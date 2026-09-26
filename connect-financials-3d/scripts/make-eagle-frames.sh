#!/usr/bin/env bash
# Cut the eagle video (wings closed → open → orbit → front hero) into the
# scroll frames the site plays: public/eagle-frames/0001.webp … plus a
# lighter mobile set and manifest.json.
#
#   scripts/make-eagle-frames.sh path/to/eagle.mp4 [frames=150]
#
# Needs ffmpeg with libwebp (set FFMPEG=/path/to/ffmpeg if it isn't on PATH;
# `pip install imageio-ffmpeg` provides one).
set -euo pipefail
IN=${1:?usage: make-eagle-frames.sh video.mp4 [frames]}
N=${2:-150}
FF=${FFMPEG:-ffmpeg}
OUT=public/eagle-frames
DESKTOP_W=2560
MOBILE_W=960

rm -rf "$OUT"/*.webp "$OUT/mobile"
mkdir -p "$OUT/mobile"

DUR=$( ("$FF" -i "$IN" 2>&1 || true) | sed -n 's/.*Duration: \([0-9:.]*\).*/\1/p' | awk -F: '{print $1*3600+$2*60+$3}')
FPS=$(awk -v n="$N" -v d="$DUR" 'BEGIN{printf "%.5f", n/d}')
echo "video ${DUR}s → $N frames (${FPS} fps)"

"$FF" -loglevel error -i "$IN" -vf "fps=$FPS,scale=${DESKTOP_W}:-2:flags=lanczos" -frames:v "$N" -c:v libwebp -quality 82 -compression_level 6 "$OUT/%04d.webp"
"$FF" -loglevel error -i "$IN" -vf "fps=$FPS,scale=${MOBILE_W}:-2:flags=lanczos" -frames:v "$N" -c:v libwebp -quality 72 -compression_level 6 "$OUT/mobile/%04d.webp"

COUNT=$(ls "$OUT"/*.webp | wc -l)
read -r W H < <( ("$FF" -i "$OUT/0001.webp" 2>&1 || true) | sed -n 's/.*, \([0-9]\+\)x\([0-9]\+\).*/\1 \2/p' | head -1)
cat > "$OUT/manifest.json" <<JSON
{
  "count": $COUNT,
  "pattern": "/eagle-frames/{index}.webp",
  "mobilePattern": "/eagle-frames/mobile/{index}.webp",
  "pad": 4,
  "width": $W,
  "height": $H
}
JSON
du -sh "$OUT" "$OUT/mobile"
echo "wrote $OUT/manifest.json ($COUNT frames, ${W}x${H})"
