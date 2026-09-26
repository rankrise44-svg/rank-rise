# Re-cuts the wing-opening frames (118-144) of the falcon video, where the motion-blurred wings
# defeat the segmentation model: adds pixels that differ from a background plate (median of the
# perched frames), fills holes and drops horizon strips. Run from a folder holding src/NNNN.png
# frames and bgplate.npy; writes cut3/NNNN.png.
import sys, numpy as np
from PIL import Image
from scipy import ndimage
from rembg import new_session, remove
s = new_session('isnet-general-use')
HZ = 492
BG = np.load('bgplate.npy')
def cut(i):
    im = Image.open(f'src/{i:04d}.png').convert('RGB')
    rgb = np.array(im).astype(np.float32) / 255
    a = np.array(remove(im, session=s).getchannel('A')).astype(np.float32) / 255
    diff = np.abs(rgb - BG).max(2)
    bright = diff > 0.07
    bright[HZ:] = False                                  # the floor and horizon glow stay rembg-only
    bright = ndimage.binary_opening(bright, iterations=2)
    bright = ndimage.binary_closing(bright, iterations=6)
    m = (a > 0.5) | bright
    m = ndimage.binary_opening(m, iterations=2)
    m[:HZ] = ndimage.binary_fill_holes(m[:HZ])
    lab, n = ndimage.label(m)
    if n > 1:
        sizes = ndimage.sum(m, lab, range(1, n + 1))
        slices = ndimage.find_objects(lab)
        # keep real parts of the bird; drop thin horizontal strips left by the horizon glow
        ok = [k + 1 for k in range(n) if sizes[k] > m.size * 0.004 and (slices[k][0].stop - slices[k][0].start) > 70]
        m = np.isin(lab, ok)
    # the horizon band only keeps what hangs off the bird above it
    band = slice(430, HZ)
    above = ndimage.binary_dilation(m[:430].any(0)[None, :], iterations=0)
    m[band] = (a[band] > 0.5) | (m[band] & ndimage.binary_erosion(m, iterations=10)[band])
    soft = ndimage.gaussian_filter(m.astype(np.float32), 1.2)
    alpha = np.maximum(np.minimum(a, ndimage.gaussian_filter(ndimage.binary_dilation(m, iterations=4).astype(np.float32), 2)), soft)
    return Image.fromarray(np.dstack([np.array(im), (np.clip(alpha, 0, 1) * 255).astype(np.uint8)]), 'RGBA')
if __name__ == '__main__':
    for a in sys.argv[1:]:
        cut(int(a)).save(f'cut3/{int(a):04d}.png'); print(a, flush=True)
