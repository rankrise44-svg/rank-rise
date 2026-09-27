# Frames straight from the video (its own black background kept), rescaled around the
# feet so the falcon stays one size while the video's camera pulls back.
import json, sys, numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage
d = {**json.load(open('extent-1.json')), **json.load(open('extent-73.json'))}
top = np.array([d[str(i)][0] for i in range(1, 145)], float)
top = ndimage.median_filter(top, 9, mode='nearest'); top = np.maximum.accumulate(top)
top = ndimage.uniform_filter1d(top, 11, mode='nearest')
FEET = 1350.0
s = (FEET - top[-1]) / (FEET - top)
out = '/home/user/rank-rise/connect-financials-3d/public/eagle-frames'
OW, OH = 2560, 1440
for i in range(int(sys.argv[1]), int(sys.argv[2]) + 1):
    im = Image.open(f'src3/{i:04d}.png').convert('RGB')
    W, H = im.size
    k = s[i - 1] * OW / W
    small = im.resize((round(W * k), round(H * k)), Image.LANCZOS).filter(ImageFilter.UnsharpMask(1.4, 50, 2))
    canvas = Image.new('RGB', (OW, OH), (0, 0, 0))
    canvas.paste(small, (round(OW / 2 - W / 2 * k), round(FEET * OW / W - FEET * k)))
    # crush the near-black background to pure black so it melts into the page
    a = np.asarray(canvas).astype(np.int16)
    lum = a.max(2, keepdims=True)
    a = np.where(lum < 10, 0, a).astype(np.uint8)
    canvas = Image.fromarray(a)
    canvas.save(f'{out}/{i:04d}.webp', quality=86, method=5)
    canvas.resize((960, 540), Image.LANCZOS).save(f'{out}/mobile/{i:04d}.webp', quality=80, method=5)
    print(i, flush=True)
