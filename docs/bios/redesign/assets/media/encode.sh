#!/usr/bin/env sh
# Re-encode the two background clips for smooth scroll scrubbing:
# every frame a keyframe (-g 1), no audio, fast start. Run from this folder:
#   sh encode.sh
# Input:  part1-src.mp4, part2-src.mp4 (the original downloads)
# Output: part1.mp4, part2.mp4 (what the website loads)
set -e
FF="${FFMPEG:-ffmpeg}"
for n in 1 2; do
  "$FF" -y -i "part$n-src.mp4" -c:v libx264 -g 1 -crf 22 -pix_fmt yuv420p -movflags +faststart -an "part$n.mp4"
done
