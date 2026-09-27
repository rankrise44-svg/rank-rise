import sys, os, json, numpy as np
from PIL import Image
from scipy import ndimage
from rembg import new_session, remove
s = new_session('isnet-general-use')
os.makedirs('cut6', exist_ok=True)
info = {}
def cut(i):
    im = Image.open(f'src3/{i:04d}.png').convert('RGB')
    W, H = im.size
    small = im.resize((W // 2, H // 2), Image.LANCZOS)
    a = np.array(remove(small, session=s).getchannel('A').resize((W, H), Image.BILINEAR)).astype(np.float32) / 255
    rgb = np.array(im).astype(np.float32) / 255
    key = np.clip((rgb.max(2) - 0.045) / 0.08, 0, 1)
    m = a > 0.5
    lab, n = ndimage.label(m)
    if n > 1:
        sz = ndimage.sum(m, lab, range(1, n + 1)); m = np.isin(lab, np.where(sz > m.size * 0.002)[0] + 1)
    gate = ndimage.gaussian_filter(ndimage.binary_dilation(m, iterations=10).astype(np.float32), 3)
    alpha = np.clip(np.maximum(a, key * gate), 0, 1)
    alpha[alpha < 0.04] = 0
    Image.fromarray(np.dstack([np.array(im), (alpha * 255).astype(np.uint8)]), 'RGBA').save(f'cut6/{i:04d}.png')
    # body extent: rows of the central columns (wings excluded)
    cx = W // 2
    core = (alpha[:, cx - 180:cx + 180] > 0.5).any(1)
    ys = np.where(core)[0]
    info[i] = [int(ys.min()), int(ys.max())] if len(ys) else None
for i in range(int(sys.argv[1]), int(sys.argv[2]) + 1):
    cut(i); print(i, info[i], flush=True)
json.dump(info, open(f'extent-{sys.argv[1]}.json', 'w'))
