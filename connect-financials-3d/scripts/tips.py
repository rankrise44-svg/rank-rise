import sys, numpy as np
from PIL import Image
from scipy import ndimage
W = 150   # width of the tapering zone at each side, px
def shape_tips(im):
    arr = np.array(im).astype(np.float32)
    a = arr[..., 3] / 255
    H, Wd = a.shape
    ys = np.arange(H)[:, None]
    rng = np.random.default_rng(3)
    for side in (0, 1):
        edge = a[:, :6] if side == 0 else a[:, -6:]
        if edge.max() < 0.5:
            continue                                   # the wing doesn't reach this edge: nothing to finish
        ref = a[:, W] if side == 0 else a[:, Wd - 1 - W]
        rows = np.where(ref > 0.5)[0]
        if len(rows) < 8:
            continue
        top, bot = rows.min(), rows.max()
        # the tip curves: its point sits a little above the middle, like a raised wing
        yc = top + (bot - top) * 0.38
        for k in range(W):
            x = k if side == 0 else Wd - 1 - k
            d = k / W                                       # 0 at the frame edge → 1 at the start of the zone
            t = np.sqrt(np.clip(d, 0, 1)) ** 0.9
            up, dn = (yc - top) * t, (bot - yc) * t
            # ragged feather ends
            jag = 6 * np.sin(ys[:, 0] * 0.45 + k * 0.3) + rng.normal(0, 1.5, H)
            dist = np.where(ys[:, 0] < yc, (yc - up) - ys[:, 0], ys[:, 0] - (yc + dn)) + jag
            keep = np.clip(1 - dist / 6, 0, 1)
            a[:, x] *= keep * np.clip(d * 6, 0, 1) ** 0.5 if k < 3 else keep
    a = ndimage.gaussian_filter(a, 0.7)
    arr[..., 3] = np.clip(a, 0, 1) * 255
    return Image.fromarray(arr.astype(np.uint8), 'RGBA')
if __name__ == '__main__':
    import os; os.makedirs('cut5', exist_ok=True)
    for x in sys.argv[1:]:
        shape_tips(Image.open(f'cut4/{int(x):04d}.png')).save(f'cut5/{int(x):04d}.png')
