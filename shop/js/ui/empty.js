import { esc, icon } from '../lib/dom.js';

/** Centered empty state used by cart, wishlist, search and missing products. */
export function emptyState({ iconName = 'bag', title, text = '', cta, links = [], heading = 'h2', actionHtml = '' }) {
  return `<div class="empty fade-in">
    <div class="empty__icon">${icon(iconName, { size: 28 })}</div>
    <${heading}>${esc(title)}</${heading}>
    ${text ? `<p>${esc(text)}</p>` : ''}
    ${cta ? `<a class="btn btn--dark btn--lg" href="${esc(cta.href)}">${esc(cta.label)}</a>` : ''}
    ${actionHtml ? `<div class="empty__action">${actionHtml}</div>` : ''}
    ${links.length ? `<div class="empty__links">${links.map((l) => `<a class="btn btn--light btn--sm" href="${esc(l.href)}">${esc(l.label)}</a>`).join('')}</div>` : ''}
  </div>`;
}
