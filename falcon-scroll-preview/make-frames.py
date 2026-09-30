# Falcon scroll preview: frames from the Higgsfield turntable video (spin, then wings open).
# The falcon keeps the video's own black background (no cut-out, so no holes or lost wingtips).
# Each frame is rescaled around the feet so the falcon stays one size while the video camera
# pulls back, the near-black background is crushed to pure black, and the bottom fades to black
# under the talons (hides the tail touching the video's bottom edge and the floor reflection).
# Usage: python3 make-frames.py <video.mp4> <out_dir>
import json, subprocess, sys
import numpy as np
from multiprocessing import Pool
from PIL import Image, ImageFilter
from scipy import ndimage

FF = '/usr/local/lib/python3.11/dist-packages/imageio_ffmpeg/binaries/ffmpeg-linux-x86_64-v7.0.2'
V, OUT = sys.argv[1], sys.argv[2]
W, H = 2560, 1440          # source and output size
FEET = 1350.0              # talon line in the source (constant across the video)
G = 0.94                   # global scale: leaves margin for the open wingtips
SETTLED = 73 * 4           # head top once the camera has settled (source px)

def measure():
    w, h = 640, 360
    p = subprocess.Popen([FF, '-v', 'error', '-i', V, '-vf', f'scale={w}:{h}', '-f', 'rawvideo', '-pix_fmt', 'gray', '-'], stdout=subprocess.PIPE)
    tops = []
    while (b := p.stdout.read(w * h)) and len(b) == w * h:
        a = np.frombuffer(b, np.uint8).reshape(h, w)
        tops.append(np.argmax((a > 28).any(1)) * 4)
    return np.array(tops, float)

def scales(tops):
    t = ndimage.median_filter(tops, 9, mode='nearest')
    t = np.minimum(np.maximum.accumulate(t), SETTLED)      # camera only pulls back, then holds
    t = ndimage.uniform_filter1d(t, 11, mode='nearest')
    return (FEET - SETTLED) / (FEET - t)

yy = np.arange(H, dtype=np.float32)[:, None]
fade = np.clip((1428 - yy) / (1428 - 1352), 0, 1)
fade = (fade * fade * (3 - 2 * fade))[..., None]

def work(args):
    i, raw, s = args
    im = Image.frombuffer('RGB', (W, H), raw, 'raw', 'RGB', 0, 1)
    k = G * s
    small = im.resize((round(W * k), round(H * k)), Image.LANCZOS).filter(ImageFilter.UnsharpMask(1.2, 40, 2))
    canvas = Image.new('RGB', (W, H), (0, 0, 0))
    canvas.paste(small, (round(W / 2 - W / 2 * k), round(FEET - FEET * k)))
    a = np.asarray(canvas).astype(np.float32)
    lum = a.max(2, keepdims=True)
    a *= np.clip((lum - 7) / 9, 0, 1) * fade             # pure black background, soft floor fade
    out = Image.fromarray(a.round().astype(np.uint8))
    out.save(f'{OUT}/{i + 1:04d}.webp', quality=82, method=4)
    return i

if __name__ == '__main__':
    s = scales(measure())
    p = subprocess.Popen([FF, '-v', 'error', '-i', V, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], stdout=subprocess.PIPE)
    def frames():
        i = 0
        while (b := p.stdout.read(W * H * 3)) and len(b) == W * H * 3:
            yield i, b, s[i]
            i += 1
    with Pool(4) as pool:
        n = 0
        for i in pool.imap(work, frames(), chunksize=2):
            n += 1
            if n % 20 == 0: print(n, flush=True)
    json.dump({'count': n, 'pattern': 'frames/{index}.webp', 'pad': 4, 'width': W, 'height': H}, open(f'{OUT}/../manifest.json', 'w'))
    print('done', n)
