/* Small DOM helpers. Deliberately not a framework — the whole app is a few
   screens that each render once, and a build step would buy nothing here
   except a build step. */

export const $  = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/* Custom properties have to go through setProperty — `Object.assign` onto a
   CSSStyleDeclaration silently drops any key starting with `--`, which is
   exactly how the score ring ends up brand-violet instead of red and the
   pillar bars end up at zero width. */
function setStyle(el, styles) {
  for (const [prop, val] of Object.entries(styles)) {
    if (val == null) continue;
    if (prop.startsWith('--')) el.style.setProperty(prop, String(val));
    else el.style[prop] = val;
  }
}

/** Build an element. `h('div.card', {onclick}, ...children)` */
export function h(spec, props = {}, ...children) {
  const [tag, ...classes] = spec.split('.');
  const el = document.createElement(tag || 'div');
  if (classes.length) el.className = classes.join(' ');

  for (const [k, v] of Object.entries(props ?? {})) {
    if (v == null || v === false) continue;
    if (k === 'html') el.innerHTML = v;
    else if (k === 'style' && typeof v === 'object') setStyle(el, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : String(v));
  }

  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

/** Replace a container's contents in one paint. */
export function render(root, ...nodes) {
  root.replaceChildren(...nodes.flat(Infinity).filter(Boolean));
  return root;
}

/** Stagger the `.rise` entrance across siblings, matching the site's 70ms. */
export function stagger(nodes, step = 70, from = 0) {
  nodes.forEach((n, i) => n.style.setProperty('--d', `${from + i * step}ms`));
  return nodes;
}

export const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
