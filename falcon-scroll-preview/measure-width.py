# Adds each frame's half-width around the spin axis (x = 1280) to manifest.json, smoothed,
# so the page can zoom out just enough for the open wings on narrow screens.
import json, numpy as np
from PIL import Image
from scipy import ndimage
m = json.load(open('manifest.json'))
half = []
for i in range(1, m['count'] + 1):
    a = np.asarray(Image.open(f'frames/{i:04d}.webp').convert('L').reduce(4)) > 24
    xs = np.where(a.any(0))[0]
    half.append(max(320 - xs[0], xs[-1] + 1 - 320) * 4)
h = ndimage.maximum_filter1d(np.array(half, float), 9)
h = ndimage.uniform_filter1d(h, 9, mode='nearest')
m['halfWidth'] = [int(v) for v in h]
m['box'] = [250, 1405]  # vertical extent of the falcon (wings raised to talons), output px
json.dump(m, open('manifest.json', 'w'))
print(m['halfWidth'][::20])
