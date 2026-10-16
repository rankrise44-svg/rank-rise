/* Blog — list at blog.html, article at blog.html?post=<slug>. */
import { $, esc, icon, params, setTitle, setDescription } from '../lib/dom.js';
import { initLayout } from '../ui/layout.js';
import { productGrid } from '../ui/product-card.js';
import { emptyState } from '../ui/empty.js';
import { POSTS } from '../data/blog.js';
import * as catalog from '../services/catalog.js';

const { categories } = await initLayout();
const root = $('[data-blog-root]');
const slug = params().get('post');
const fmt = (d) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

if (!slug) {
  root.innerHTML = `<div class="posts" style="padding-block:24px 64px">${POSTS.map((p) => `
    <a class="post-card" href="blog.html?post=${p.slug}">
      <img src="${esc(p.image)}" alt="" loading="lazy" width="800" height="500">
      <div class="post-card__body">
        <p class="post-meta">${fmt(p.date)} · ${p.readMins} min read</p>
        <h2>${esc(p.title)}</h2>
        <p>${esc(p.excerpt)}</p>
        <span class="section__link">Read article ${icon('arrow', { size: 16 })}</span>
      </div>
    </a>`).join('')}</div>`;
} else {
  const post = POSTS.find((p) => p.slug === slug);
  $('[data-blog-head]').hidden = true;
  if (!post) {
    setTitle('Article not found');
    root.innerHTML = emptyState({ heading: 'h1', iconName: 'book', title: 'We couldn’t find that article', cta: { label: 'Back to the blog', href: 'blog.html' } });
  } else {
    setTitle(post.title);
    setDescription(post.excerpt);
    const related = (await Promise.all(post.related.map((s) => catalog.getProduct(s)))).filter(Boolean);
    root.innerHTML = `<article class="article">
      <nav class="crumbs" aria-label="Breadcrumb"><ol><li><a href="index.html">Home</a></li><li><a href="blog.html">Blog</a></li><li aria-current="page">${esc(post.title)}</li></ol></nav>
      <p class="post-meta" style="margin-top:18px">${fmt(post.date)} · ${post.readMins} min read</p>
      <h1 style="margin-top:8px">${esc(post.title)}</h1>
      <div class="article__img"><img src="${esc(post.image)}" alt="" width="800" height="450"></div>
      <div class="prose">${post.body.map((para) => (para.startsWith('## ') ? `<h2>${esc(para.slice(3))}</h2>` : `<p>${esc(para)}</p>`)).join('')}</div>
    </article>
    ${related.length ? `<section class="section section--surface"><div class="container">
      <div class="section__head"><h2>Shop this article</h2><a class="section__link" href="blog.html" data-back>All articles ${icon('arrow', { size: 16 })}</a></div>
      <div class="grid grid--4">${productGrid(related, categories)}</div></div></section>` : ''}`;
  }
}
