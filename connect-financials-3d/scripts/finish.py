import json, os, sys, numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage
d = {**json.load(open('extent-1.json')), **json.load(open('extent-73.json'))}
top = np.array([d[str(i)][0] for i in range(1, 145)], float)
top = ndimage.median_filter(top, 9, mode='nearest')
top = np.maximum.accumulate(top)
top = ndimage.uniform_filter1d(top, 11, mode='nearest')
FEET = 1350.0
s = (FEET - top[-1]) / (FEET - top)
out = '/home/user/rank-rise/connect-financials-3d/public/eagle-frames'
OW, OH = 2560, 1440
FLOOR_Y = 1372

def clean(i):
    im = np.array(Image.open(f'cut6/{i:04d}.png')).astype(np.float32) / 255
    rgb, a = im[..., :3], im[..., 3]
    H, W = a.shape
    lum = rgb.max(2)
    # 2. un-premultiply the black background out of the edges (no dark fringe)
    edge = (a > 0.02) & (a < 0.98)
    rgb[edge] = np.clip(rgb[edge] / np.maximum(a[edge, None], 0.25), 0, 1)
    # 3. tighten the matte slightly and smooth it
    a = np.clip((a - 0.12) / 0.88, 0, 1)
    a = ndimage.gaussian_filter(a, 0.5)
    img = Image.fromarray((np.dstack([rgb, a]) * 255).astype(np.uint8), 'RGBA')
    # 4. crisper detail
    c = img.convert('RGB').filter(ImageFilter.UnsharpMask(radius=1.4, percent=55, threshold=2))
    c.putalpha(img.getchannel('A'))
    return c

a0, a1 = int(sys.argv[1]), int(sys.argv[2])
for i in range(a0, a1 + 1):
    img = clean(i)
    W, H = img.size
    k = s[i - 1] * OW / W
    small = img.resize((round(W * k), round(H * k)), Image.LANCZOS)
    canvas = Image.new('RGBA', (OW, OH), (0, 0, 0, 0))
    canvas.paste(small, (round(OW / 2 - W / 2 * k), round(FEET * OW / W - FEET * k)), small)
    # 1. floor reflection: after normalisation the claws always land on the same floor line;
    #    nothing under the feet may hang below it (the tail, off to the sides, is left alone)
    arr = np.array(canvas)
    ys = np.arange(OH)[:, None]
    fade = np.clip(1 - (ys - FLOOR_Y) / 8.0, 0, 1)
    band = slice(880, 1680)
    if not (36 <= i <= 58):   # back views: the tail hangs over the floor line, keep it whole
        arr[:, band, 3] = (arr[:, band, 3] * fade).astype(np.uint8)
    canvas = Image.fromarray(arr, 'RGBA')
    canvas.save(f'{out}/{i:04d}.webp', quality=85, method=5)
    canvas.resize((960, 540), Image.LANCZOS).save(f'{out}/mobile/{i:04d}.webp', quality=80, method=5)
    print(i, flush=True)
