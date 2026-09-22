/* Fetch the Google Fonts CSS and inline every font file it points at as a
   data: URI, so the PDF render has no network dependency at all. Only the
   subsets we actually set type in are kept — latin, latin-ext, and arabic
   for the Lebanese caption. */
import { writeFileSync } from 'node:fs';

const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';
const KEEP = ['/* latin */', '/* latin-ext */', '/* arabic */'];

const FAMILIES = [
  'Anton',
  'DM+Sans:wght@400;500;600;700',
  'Noto+Sans+Arabic:wght@400;500;600;700',
];

const css = await (await fetch(
  `https://fonts.googleapis.com/css2?${FAMILIES.map(f => `family=${f}`).join('&')}&display=swap`,
  { headers: { 'User-Agent': UA } })).text();

// Each @font-face is preceded by a /* subset */ comment. Split on those so a
// block can be matched to its subset and dropped if we do not need it.
const blocks = css.split(/(?=\/\* [a-z0-9-]+ \*\/)/).filter(Boolean);
let out = '';
let kept = 0, inlined = 0;

for (const block of blocks) {
  const subset = block.match(/^\/\* ([a-z0-9-]+) \*\//)?.[0];
  if (!subset || !KEEP.includes(subset)) continue;
  kept++;

  const url = block.match(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/)?.[1];
  if (!url) { out += block; continue; }

  const buf = Buffer.from(await (await fetch(url, { headers: { 'User-Agent': UA } })).arrayBuffer());
  out += block.replace(url, `data:font/woff2;base64,${buf.toString('base64')}`);
  inlined++;
}

writeFileSync('fonts.css', out);
console.log(`kept ${kept} faces, inlined ${inlined}`);
console.log('families:', [...new Set(out.match(/font-family: '([^']+)'/g))].join(' '));
console.log('fonts.css size:', (Buffer.byteLength(out) / 1024 / 1024).toFixed(2), 'MB');
