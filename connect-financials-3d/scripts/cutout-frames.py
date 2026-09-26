"""
Cut the falcon out of every frame of the eagle video, so it stands in the
3D scene on its own (no floor, no horizon), and write the scroll frames.

  python3 scripts/cutout-frames.py assets-src/falcon-turntable.mp4 [frames=144]

Needs: pip install "rembg[cpu]" scipy imageio-ffmpeg pillow
Writes public/eagle-frames/0001.webp … (desktop, native width), mobile/…
(720 px), and manifest.json. Frames are WebP with alpha.
"""
import json, os, subprocess, sys, tempfile
import numpy as np
from PIL import Image
from scipy import ndimage
import imageio_ffmpeg
from rembg import new_session, remove

src = sys.argv[1]
count = int(sys.argv[2]) if len(sys.argv) > 2 else 144
out = 'public/eagle-frames'
ff = imageio_ffmpeg.get_ffmpeg_exe()

probe = subprocess.run([ff, '-i', src], capture_output=True, text=True).stderr
dur = next(l for l in probe.splitlines() if 'Duration' in l).split('Duration: ')[1].split(',')[0]
h, m, s = dur.split(':')
seconds = int(h) * 3600 + int(m) * 60 + float(s)

tmp = tempfile.mkdtemp()
subprocess.run([ff, '-loglevel', 'error', '-i', src, '-an', '-vf', f'fps={count / seconds:.5f}', '-frames:v', str(count), f'{tmp}/%04d.png'], check=True)

os.makedirs(f'{out}/mobile', exist_ok=True)
for f in os.listdir(out):
    if f.endswith('.webp'):
        os.remove(f'{out}/{f}')
session = new_session('isnet-general-use')
w = h = 0
for i in range(1, count + 1):
    im = Image.open(f'{tmp}/{i:04d}.png').convert('RGB')
    a = np.array(remove(im, session=session).getchannel('A')).astype(np.float32) / 255
    mask = ndimage.binary_opening(a > 0.5, iterations=3)          # drop thin floor-grid lines
    lab, n = ndimage.label(mask)
    if n > 1:
        mask = lab == (np.argmax(ndimage.sum(mask, lab, range(1, n + 1))) + 1)  # keep the falcon only
    gate = ndimage.gaussian_filter(ndimage.binary_dilation(mask, iterations=6).astype(np.float32), 2)
    rgba = Image.fromarray(np.dstack([np.array(im), (a * gate * 255).astype(np.uint8)]), 'RGBA')
    w, h = rgba.size
    rgba.save(f'{out}/{i:04d}.webp', quality=84, method=6)
    rgba.resize((720, round(720 * h / w)), Image.LANCZOS).save(f'{out}/mobile/{i:04d}.webp', quality=78, method=6)
    print(f'{i}/{count}', flush=True)

json.dump({'count': count, 'pattern': 'eagle-frames/{index}.webp', 'mobilePattern': 'eagle-frames/mobile/{index}.webp',
           'pad': 4, 'width': w, 'height': h}, open(f'{out}/manifest.json', 'w'), indent=2)
print('done')
