import sys, numpy as np
from PIL import Image
from scipy import ndimage
from rembg import new_session, remove
s = new_session('isnet-general-use')
FLOOR = 655
def cut(i):
    im = Image.open(f'src2/{i:04d}.png').convert('RGB')
    rgb = np.array(im).astype(np.float32) / 255
    a = np.array(remove(im, session=s).getchannel('A')).astype(np.float32) / 255
    l = rgb.max(2)
    key = np.clip((l - 0.05) / 0.07, 0, 1)                 # black background: luminance key
    key[FLOOR:] = 0                                         # the floor reflection is left to the model
    m = (a > 0.5) | (key > 0.5)
    m = ndimage.binary_opening(m, iterations=1)
    m = ndimage.binary_closing(m, iterations=3)
    # fill only small holes (dark gaps between feathers), not the space between legs and wings
    filled = ndimage.binary_fill_holes(m)
    holes, nh = ndimage.label(filled & ~m)
    if nh:
        hs = ndimage.sum(holes > 0, holes, range(1, nh + 1))
        m |= np.isin(holes, np.where(hs < m.size * 0.0015)[0] + 1)
    lab, n = ndimage.label(m)
    if n > 1:
        sizes = ndimage.sum(m, lab, range(1, n + 1))
        m = np.isin(lab, np.where(sizes > m.size * 0.002)[0] + 1)
    solid = ndimage.gaussian_filter(m.astype(np.float32), 1.0)
    alpha = np.clip(np.maximum(solid * np.maximum(key, a), ndimage.binary_erosion(m, iterations=2) * 1.0), 0, 1)
    alpha = ndimage.gaussian_filter(alpha, 0.6)
    return Image.fromarray(np.dstack([np.array(im), (alpha * 255).astype(np.uint8)]), 'RGBA')
if __name__ == '__main__':
    import os; os.makedirs('cut4', exist_ok=True)
    for x in sys.argv[1:]:
        cut(int(x)).save(f'cut4/{int(x):04d}.png'); print(x, flush=True)
