/* Home-page merchandising: hero slides and promo banners. Edit these
   to change campaigns without touching layout code. `href` values are
   ordinary store links. */

export const HERO_SLIDES = [
  {
    eyebrow: 'Everything you need for a',
    title: 'Smarter Kitchen,',
    accent: 'Better Living.',
    text: 'Granite cookware, sharp tools and smart storage — chosen for real Lebanese kitchens.',
    image: 'assets/hero/hero-1.svg',
    badge: { top: 'Up to', big: '30%', bottom: 'off' },
    primary: { label: 'Shop Now', href: 'shop.html' },
    secondary: { label: 'Explore Categories', href: '#categories' },
  },
  {
    eyebrow: 'A place for every spice',
    title: 'Organise Your',
    accent: 'Pantry Beautifully.',
    text: 'Revolving racks, airtight jars and stackable bins that keep za’atar, rice and bulgur fresh.',
    image: 'assets/hero/hero-2.svg',
    badge: { top: 'From', big: '$24', bottom: 'racks' },
    primary: { label: 'Shop Storage', href: 'shop.html?category=storage' },
    secondary: { label: 'View Deals', href: 'shop.html?collection=deals' },
  },
  {
    eyebrow: 'Less effort, more flavour',
    title: 'Appliances That',
    accent: 'Work Hard.',
    text: 'Air fryers, kettles and blenders with simple controls and a one-year warranty.',
    image: 'assets/hero/hero-3.svg',
    badge: { top: 'Save', big: '$26', bottom: 'air fryer' },
    primary: { label: 'Shop Appliances', href: 'shop.html?category=appliances' },
    secondary: { label: 'Best Sellers', href: 'shop.html?collection=bestsellers' },
  },
];

export const PROMO_BANNERS = [
  { theme: 'dark',  title: 'Cook Like a Chef Everyday',    text: 'Premium cookware for perfect cooking.',       cta: 'Shop Cookware',      href: 'shop.html?category=cookware',      image: 'assets/products/cast-iron-casserole-t.svg' },
  { theme: 'light', title: 'Smart Tools for Smart Kitchens', text: 'Make cooking easier and more enjoyable.',  cta: 'Shop Kitchen Tools', href: 'shop.html?category=kitchen-tools', image: 'assets/products/silicone-utensil-set-t.svg' },
  { theme: 'green', title: 'Organize Your Kitchen Beautifully', text: 'Neat spaces, happy cooking.',            cta: 'Shop Storage',       href: 'shop.html?category=storage',       image: 'assets/products/glass-spice-jar-set-t.svg' },
  { theme: 'cream', title: 'Hot Deals You’ll Love',        text: 'Grab the best offers on top-rated products.', cta: 'Shop Deals',         href: 'shop.html?collection=deals',       image: 'assets/promo/coin.svg' },
];
