#!/usr/bin/env bash
# Builds the RankRise "Launch to the Moon" animatic prototype (9:16, 1080x1920)
# from the Higgsfield keyframes + the original RR logo spin clip.
set -euo pipefail
cd "$(dirname "$0")"

FONT=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf
KF=keyframes
TMP=$(mktemp -d)
FPS=30

# Ken Burns helper: image -> clip with zoom/pan.  $1 img $2 seconds $3 zoom expr $4 x expr $5 y expr $6 out
kb() {
  local frames
  frames=$(python3 -c "print(int(round($2*$FPS)))")
  ffmpeg -v error -y -loop 1 -i "$1" -vf "scale=2160:-2:flags=lanczos,crop=2160:3840,zoompan=z='$3':x='$4':y='$5':d=$frames:s=1080x1920:fps=$FPS,format=yuv420p" \
    -frames:v "$frames" "$6"
}
CX="iw/2-(iw/zoom/2)"; CY="ih/2-(ih/zoom/2)"

# S1 cockpit + countdown 3-2-1 (5.0s)
kb $KF/01_cockpit_countdown.png 5.0 "1+0.10*on/150" "$CX" "$CY" $TMP/s1_raw.mp4
num() { # $1 text $2 start
  echo "drawtext=fontfile=$FONT:text='$1':fontsize=420:fontcolor=white:borderw=6:bordercolor=0x7B5CFF:x=(w-tw)/2:y=(h-th)/2-120:enable='between(t,$2,$2+0.95)':alpha='max(0,1-(t-$2)/0.95)'"
}
ffmpeg -v error -y -i $TMP/s1_raw.mp4 -vf "$(num 3 1.0),$(num 2 2.0),$(num 1 3.0),\
drawtext=fontfile=$FONT:text='IGNITION':fontsize=120:fontcolor=white:borderw=4:bordercolor=0x7B5CFF:x=(w-tw)/2:y=(h-th)/2-120:enable='gte(t,4.0)',\
drawtext=fontfile=$FONT:text='RANKRISE  MISSION 01':fontsize=44:fontcolor=white@0.85:x=(w-tw)/2:y=140:enable='lt(t,1.0)'" $TMP/s1.mp4

# S2 liftoff, violent decaying camera shake (3.5s)
kb $KF/02_liftoff.png 3.5 "1.12+0.08*on/105" "$CX" "$CY" $TMP/s2_raw.mp4
ffmpeg -v error -y -i $TMP/s2_raw.mp4 -vf "scale=1160:2062,crop=1080:1920:x='40+36*exp(-t*0.6)*sin(n*2.3)':y='71+36*exp(-t*0.6)*cos(n*1.7)'" $TMP/s2.mp4

# S3 moon through window, slow push (3.5s)
kb $KF/03_moon_approach.png 3.5 "1+0.15*on/105" "$CX" "ih*0.35-(ih/zoom*0.35)" $TMP/s3_raw.mp4
ffmpeg -v error -y -i $TMP/s3_raw.mp4 -vf "drawtext=fontfile=$FONT:text='DESTINATION\: #1':fontsize=78:fontcolor=white:borderw=3:bordercolor=black@0.6:x=(w-tw)/2:y=h-420:alpha='min(1,max(0,(t-0.6)/0.5))'" $TMP/s3.mp4

# S4 crew on the moon (3.5s)
kb $KF/04_we_made_it.png 3.5 "1.15-0.15*on/105" "$CX" "$CY" $TMP/s4_raw.mp4
ffmpeg -v error -y -i $TMP/s4_raw.mp4 -vf "drawtext=fontfile=$FONT:text='WE MADE IT.':fontsize=120:fontcolor=white:borderw=4:bordercolor=0x7B5CFF:x=(w-tw)/2:y=h-460:alpha='min(1,max(0,(t-0.5)/0.4))'" $TMP/s4.mp4

# S5 crane up from crew to the RR ship (4.5s)
kb $KF/05_rr_ship_reveal.png 4.5 "1.7-0.7*on/135" "$CX" "(ih-ih/zoom)*(1-on/135)" $TMP/s5_raw.mp4
ffmpeg -v error -y -i $TMP/s5_raw.mp4 -vf "drawtext=fontfile=$FONT:text='RANK RISE':fontsize=130:fontcolor=white:borderw=4:bordercolor=0x7B5CFF:x=(w-tw)/2:y=h-360:alpha='min(1,max(0,(t-2.6)/0.5))'" $TMP/s5.mp4

# S6 end card: the original RR logo spin + tagline (4.65s)
ffmpeg -v error -y -i assets/rr_logo_spin.mp4 -f lavfi -i "color=c=0x07050f:s=1080x1920:r=$FPS:d=4.65" -filter_complex \
"[0:v]fps=$FPS,crop=200:192:60:0,scale=1000:-2:flags=lanczos[logo];[1:v][logo]overlay=(W-w)/2:430:shortest=1,\
drawtext=fontfile=$FONT:text='RANK RISE':fontsize=130:fontcolor=white:x=(w-tw)/2:y=1460:alpha='min(1,max(0,(t-0.4)/0.5))',\
drawtext=fontfile=$FONT:text='YOU RISE.':fontsize=78:fontcolor=0xA88BFF:x=(w-tw)/2:y=1620:alpha='min(1,max(0,(t-1.2)/0.5))',format=yuv420p" \
  -t 4.65 -an $TMP/s6.mp4

# Stitch with transitions (0.4s each). Offsets = running length - 0.4
ffmpeg -v error -y -i $TMP/s1.mp4 -i $TMP/s2.mp4 -i $TMP/s3.mp4 -i $TMP/s4.mp4 -i $TMP/s5.mp4 -i $TMP/s6.mp4 -filter_complex \
"[0][1]xfade=transition=fadewhite:duration=0.4:offset=4.6[a];\
[a][2]xfade=transition=fade:duration=0.4:offset=7.7[b];\
[b][3]xfade=transition=smoothup:duration=0.4:offset=10.8[c];\
[c][4]xfade=transition=fade:duration=0.4:offset=13.9[d];\
[d][5]xfade=transition=fadeblack:duration=0.4:offset=18.0,format=yuv420p[v]" -map "[v]" $TMP/video.mp4

DUR=22.65
# Sound design: countdown beeps, ignition tone, launch rumble, space drone, logo hit
ffmpeg -v error -y \
  -f lavfi -i "aevalsrc='0.35*sin(2*PI*880*t)*(between(t,1,1.15)+between(t,2,2.15)+between(t,3,3.15))+0.35*sin(2*PI*1320*t)*between(t,4,4.5)+0.06*sin(2*PI*55*t)+0.04*sin(2*PI*82.5*t)+0.9*sin(2*PI*45*t)*exp(-(t-18.4)*2.2)*gte(t,18.4)':s=44100:d=$DUR" \
  -f lavfi -i "anoisesrc=color=brown:amplitude=1:d=$DUR:r=44100" \
  -filter_complex "[1]lowpass=f=140,lowpass=f=140,volume='if(lt(t,4.4),0,if(lt(t,5.2),(t-4.4)/0.8*2.2,max(0,2.2*(1-(t-5.2)/4.5))))':eval=frame[r];\
[0][r]amix=inputs=2:normalize=0,afade=t=out:st=$(python3 -c "print($DUR-1.2)"):d=1.2,alimiter=limit=0.9[a]" -map "[a]" $TMP/audio.wav

mkdir -p out
ffmpeg -v error -y -i $TMP/video.mp4 -i $TMP/audio.wav -c:v libx264 -preset slow -crf 20 -pix_fmt yuv420p -c:a aac -b:a 192k -shortest -movflags +faststart out/rankrise_launch_prototype.mp4
rm -rf "$TMP"
echo "Built out/rankrise_launch_prototype.mp4"
