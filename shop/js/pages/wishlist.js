import { $ } from '../lib/dom.js';
import { initLayout } from '../ui/layout.js';
import { productGrid } from '../ui/product-card.js';
import { emptyState } from '../ui/empty.js';
import { toast } from '../ui/toast.js';
import * as wishlist from '../services/wishlist.js';
import * as cart from '../services/cart.js';

const { categories } = await initLayout();
const root = $('[data-wish-root]');
const toolbar = $('[data-wish-toolbar]');

async function render() {
  const items = await wishlist.resolve();
  root.removeAttribute('aria-busy');
  toolbar.hidden = !items.length;
  if (!items.length) {
    root.innerHTML = emptyState({
      iconName: 'heart',
      title: 'Your wishlist is empty',
      text: 'Tap the heart on any product to save it here for later.',
      cta: { label: 'Discover products', href: 'shop.html' },
    });
    return;
  }
  const inStock = items.filter((p) => p.stock > 0).length;
  $('[data-wish-count-text]').textContent = `${items.length} saved item${items.length === 1 ? '' : 's'}`;
  $('[data-wish-all]').disabled = inStock === 0;
  root.innerHTML = `<div class="grid grid--4">${productGrid(items, categories)}</div>`;
}

$('[data-wish-all]').addEventListener('click', async () => {
  const items = await wishlist.resolve();
  let added = 0;
  for (const p of items) if (p.stock > 0) added += cart.add(p, 1).added;
  const skipped = items.filter((p) => p.stock <= 0).length;
  toast(added ? `Added ${added} item${added === 1 ? '' : 's'} to your cart${skipped ? ` (${skipped} sold out)` : ''}` : 'Nothing new to add — check your cart.',
    { action: { label: 'View cart', href: 'cart.html' }, tone: added ? 'default' : 'error' });
});

$('[data-wish-clear]').addEventListener('click', () => {
  if (window.confirm('Remove all items from your wishlist?')) {
    wishlist.clear();
    toast('Wishlist cleared');
  }
});

wishlist.subscribe(render);
render();
