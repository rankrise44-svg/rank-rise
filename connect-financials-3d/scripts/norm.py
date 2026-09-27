import json, os, numpy as np
from PIL import Image
from scipy import ndimage
d = {**json.load(open('extent-1.json')), **json.load(open('extent-73.json'))}
top = np.array([d[str(i)][0] for i in range(1, 145)], float)
top = ndimage.median_filter(top, 9, mode='nearest')
top = np.maximum.accumulate(top)                    # the camera only pulls back: top only moves down
top = ndimage.uniform_filter1d(top, 11, mode='nearest')
FEET = 1350.0
h = FEET - top
s = h[-1] / h                                        # shrink earlier frames to the final framing
out = '/home/user/rank-rise/connect-financials-3d/public/eagle-frames'
for f in os.listdir(out):
    if f.endswith('.webp'): os.remove(f'{out}/{f}')
os.makedirs(f'{out}/mobile', exist_ok=True)
for f in os.listdir(f'{out}/mobile'): os.remove(f'{out}/mobile/{f}')
OW, OH = 1920, 1080
for i in range(1, 145):
    im = Image.open(f'cut6/{i:04d}.png')
    W, H = im.size
    k = s[i - 1] * OW / W
    nw, nh = round(W * k), round(H * k)
    small = im.resize((nw, nh), Image.LANCZOS)
    canvas = Image.new('RGBA', (OW, OH), (0, 0, 0, 0))
    # keep the feet at the same place: (W/2, FEET) → (OW/2, FEET*OW/W)
    x = round(OW / 2 - (W / 2) * k)
    y = round(FEET * OW / W - FEET * k)
    canvas.alpha_composite(small, (x, y)) if x >= 0 and y >= 0 else canvas.paste(small, (x, y), small)
    canvas.save(f'{out}/{i:04d}.webp', quality=86, method=5)
    canvas.resize((800, 450), Image.LANCZOS).save(f'{out}/mobile/{i:04d}.webp', quality=80, method=5)
json.dump({'count': 144, 'pattern': 'eagle-frames/{index}.webp', 'mobilePattern': 'eagle-frames/mobile/{index}.webp', 'pad': 4, 'width': OW, 'height': OH}, open(f'{out}/manifest.json', 'w'), indent=2)
print('scale first/mid/last', s[0], s[70], s[-1])
