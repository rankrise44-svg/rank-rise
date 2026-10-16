/* Photo uploads to the "product-images" bucket (admins only, enforced by the database). */
import { sb, publicUrl, BUCKET } from './sb.js';

export const ACCEPT = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];

/** Shrink big photos (max 1600 px) and re-encode, so pages load fast. */
export async function prepareImage(file) {
  if (!ACCEPT.includes(file.type)) throw new Error(`“${file.name}” isn’t a JPG, PNG or WebP photo.`);
  let bmp;
  try { bmp = await createImageBitmap(file); } catch { bmp = null; }
  if (!bmp) return { blob: file, ext: file.type.split('/')[1].replace('jpeg', 'jpg'), type: file.type };
  const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  if (scale === 1 && file.size < 700 * 1024) return { blob: file, ext: file.type.split('/')[1].replace('jpeg', 'jpg'), type: file.type };
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bmp.width * scale); canvas.height = Math.round(bmp.height * scale);
  canvas.getContext('2d').drawImage(bmp, 0, 0, canvas.width, canvas.height);
  const toBlob = (type, quality) => new Promise((r) => canvas.toBlob(r, type, quality));
  let blob = await toBlob('image/webp', 0.85);
  let type = 'image/webp';
  if (!blob || blob.type !== 'image/webp') { blob = await toBlob('image/jpeg', 0.86); type = 'image/jpeg'; }
  if (blob.size > 5 * 1024 * 1024) throw new Error(`“${file.name}” is still over 5 MB after resizing.`);
  return { blob, ext: type === 'image/webp' ? 'webp' : 'jpg', type };
}


/** Upload one photo under a folder (e.g. "categories"); returns { url, path }. */
export async function uploadImage(folder, file) {
  const { blob, ext, type } = await prepareImage(file);
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await sb.storage.from(BUCKET).upload(path, blob, { contentType: type, cacheControl: '31536000', upsert: false });
  if (error) throw new Error(/row-level|security/i.test(error.message || '') ? 'Your account isn’t allowed to upload photos.' : `Upload failed: ${error.message}`);
  return { url: publicUrl(path), path };
}

/** Remove a photo we uploaded earlier (ignores repo images and failures). */
export async function removeImageByUrl(url) {
  const marker = `/object/public/${BUCKET}/`;
  const i = String(url || '').indexOf(marker);
  if (i < 0) return;
  await sb.storage.from(BUCKET).remove([decodeURIComponent(url.slice(i + marker.length))]);
}
