// Turns the artifact build (dist-artifact/) into one HTML file with the CSS
// and JS inlined, written as a page fragment (the preview host adds the
// doctype/head/body skeleton itself).
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = 'dist-artifact/assets';
const files = readdirSync(dir);
const js = files.filter((f) => f.endsWith('.js'));
const css = files.filter((f) => f.endsWith('.css'));
if (js.length !== 1) throw new Error(`expected one JS bundle, found ${js.join(', ')}`);

const script = readFileSync(join(dir, js[0]), 'utf8').replace(/<\/script/gi, '<\\/script');
const style = css.map((f) => readFileSync(join(dir, f), 'utf8')).join('\n').replace(/<\/style/gi, '<\\/style');

const html = `<title>Connect Financials</title>
<meta name="description" content="Connect Financials: Trade Smarter, Move Faster, Go Further.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap">
<style>${style}</style>
<div id="root"></div>
<script type="module">${script}</script>
`;
writeFileSync('dist-artifact/connect-financials.html', html);
console.log(`dist-artifact/connect-financials.html  ${(html.length / 1024 / 1024).toFixed(2)} MB`);
