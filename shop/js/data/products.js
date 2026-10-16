/* ═══════════════════════════════════════════════════════════════
   CEDARLINE — PRODUCT CATALOG (fictional demo data)
   ───────────────────────────────────────────────────────────────
   This file is the stand-in for a products table. Keep the shape
   when moving to a database — the UI only depends on these fields:

     id              stable unique id (string)
     slug            URL id → product.html?id=<slug>
     name, category  category = an id from categories.js
     price           store currency, e.g. 34 or 34.5
     compareAtPrice  original price when on sale, else null
     stock           units available (0 = sold out)
     rating, reviewCount
     badges          any of 'bestseller' | 'new'
     tags            extra search keywords
     images          paths in assets/products/ (or full URLs)
     createdAt       ISO date — drives "Newest" sorting
     featured        shown on the home page
     popularity      0–100 — drives "Featured" sorting
   ═══════════════════════════════════════════════════════════════ */

const img = (slug) => [`assets/products/${slug}-1.svg`, `assets/products/${slug}-2.svg`];

export const PRODUCTS = [
  {
    id: 'p001', slug: 'oak-edge-cutting-board', name: 'Oak Edge Cutting Board', category: 'kitchen',
    price: 34, compareAtPrice: null, stock: 24, rating: 4.8, reviewCount: 126,
    badges: ['bestseller'], tags: ['wood', 'chopping', 'serving', 'board'],
    shortDescription: 'Solid oak board with a carry handle — for chopping, serving and everything between.',
    description: 'Cut from a single piece of FSC-certified oak and finished with food-safe mineral oil. The generous surface handles a full Sunday spread, and the rounded handle makes it just as good on the table as it is on the counter.',
    features: ['Single-piece solid oak', 'Knife-friendly end finish', 'Juice-safe flat surface', 'Hanging hole in the handle'],
    specs: { Material: 'Solid oak, mineral oil finish', Dimensions: '45 × 28 × 2 cm', Weight: '1.4 kg', Care: 'Hand wash, oil monthly' },
    images: img('oak-edge-cutting-board'), createdAt: '2026-03-02', featured: true, popularity: 96,
  },
  {
    id: 'p002', slug: 'stoneware-utensil-crock', name: 'Stoneware Utensil Crock', category: 'kitchen',
    price: 22, compareAtPrice: null, stock: 31, rating: 4.6, reviewCount: 58,
    badges: [], tags: ['holder', 'ceramic', 'speckled', 'utensils'],
    shortDescription: 'A weighty speckled crock that keeps spoons and spatulas within reach.',
    description: 'Thrown in heavy stoneware with a speckled, satin glaze. It is heavy enough not to tip when you pull a ladle out, and wide enough for a full set of everyday tools.',
    features: ['Heavy, tip-resistant base', 'Speckled satin glaze', 'Felt pads protect counters'],
    specs: { Material: 'Glazed stoneware', Dimensions: 'Ø 13 × 17 cm', Weight: '1.1 kg', Care: 'Dishwasher safe' },
    images: img('stoneware-utensil-crock'), createdAt: '2026-05-14', featured: false, popularity: 71,
  },
  {
    id: 'p003', slug: 'glass-spice-jar-set', name: 'Glass Spice Jar Set of 6', category: 'kitchen',
    price: 28, compareAtPrice: 35, stock: 18, rating: 4.7, reviewCount: 203,
    badges: ['bestseller'], tags: ['spices', 'jars', 'pantry', 'cork', 'zaatar', 'sumac'],
    shortDescription: 'Six airtight glass jars with cork lids — za’atar, sumac and seven-spice, sorted.',
    description: 'Clear borosilicate jars with natural cork lids lined for an airtight seal. Sized for 100 g refills, with a wide mouth for measuring spoons and a set of blank labels included.',
    features: ['Set of 6 jars, 180 ml each', 'Airtight lined cork lids', 'Wide mouth for spoons', 'Includes 24 blank labels'],
    specs: { Material: 'Borosilicate glass, natural cork', Dimensions: 'Ø 5.5 × 11 cm each', Weight: '1.2 kg (set)', Care: 'Jars dishwasher safe; wipe lids' },
    images: img('glass-spice-jar-set'), createdAt: '2026-02-10', featured: true, popularity: 93,
  },
  {
    id: 'p004', slug: 'matte-ceramic-pour-over-set', name: 'Matte Ceramic Pour-Over Set', category: 'kitchen',
    price: 46, compareAtPrice: null, stock: 0, rating: 4.9, reviewCount: 41,
    badges: [], tags: ['coffee', 'dripper', 'carafe', 'brew'],
    shortDescription: 'Charcoal ceramic dripper and glass carafe for a slow, even cup.',
    description: 'A matte charcoal ceramic dripper that holds heat for an even extraction, paired with a 600 ml heat-resistant glass carafe. Takes standard size 02 cone filters.',
    features: ['Ceramic dripper holds heat', '600 ml glass carafe', 'Fits size 02 filters'],
    specs: { Material: 'Ceramic, borosilicate glass', Dimensions: 'Carafe Ø 11 × 14 cm', Weight: '0.9 kg', Care: 'Dishwasher safe' },
    images: img('matte-ceramic-pour-over-set'), createdAt: '2026-07-21', featured: false, popularity: 74,
  },
  {
    id: 'p005', slug: 'woven-seagrass-basket', name: 'Woven Seagrass Basket, Large', category: 'storage',
    price: 39, compareAtPrice: null, stock: 15, rating: 4.7, reviewCount: 88,
    badges: ['new'], tags: ['basket', 'laundry', 'blankets', 'natural', 'woven'],
    shortDescription: 'Hand-woven seagrass basket for throws, toys or laundry.',
    description: 'Hand-woven from natural seagrass over a sturdy frame, with two braided handles. Tall enough for a folded throw or a week of laundry, and soft enough to sit in a living room.',
    features: ['Hand-woven natural seagrass', 'Braided carry handles', 'Holds its shape when empty'],
    specs: { Material: 'Seagrass, steel frame', Dimensions: 'Ø 40 × 45 cm', Weight: '1.6 kg', Care: 'Dust or wipe with a dry cloth' },
    images: img('woven-seagrass-basket'), createdAt: '2026-09-18', featured: true, popularity: 82,
  },
  {
    id: 'p006', slug: 'stackable-pantry-bins', name: 'Stackable Clear Pantry Bins, Set of 4', category: 'storage',
    price: 32, compareAtPrice: null, stock: 27, rating: 4.5, reviewCount: 64,
    badges: [], tags: ['pantry', 'containers', 'rice', 'pasta', 'airtight', 'fridge'],
    shortDescription: 'Airtight, stackable bins that turn a crowded pantry into a clear one.',
    description: 'BPA-free clear bins with silicone-sealed lids that lock and stack. See at a glance how much rice, bulgur or pasta is left — and keep it fresh through humid Beirut summers.',
    features: ['Set of 4: 2 × 1.2 L, 2 × 2.4 L', 'Silicone-sealed snap lids', 'Stack securely when full', 'BPA-free'],
    specs: { Material: 'BPA-free Tritan, silicone', Dimensions: '24 × 12 × 10 / 20 cm', Weight: '1.3 kg (set)', Care: 'Top-rack dishwasher safe' },
    images: img('stackable-pantry-bins'), createdAt: '2026-06-03', featured: false, popularity: 77,
  },
  {
    id: 'p007', slug: 'linen-drawer-organizers', name: 'Linen Drawer Organizers, Set of 3', category: 'storage',
    price: 24, compareAtPrice: 30, stock: 4, rating: 4.4, reviewCount: 37,
    badges: [], tags: ['drawer', 'boxes', 'fabric', 'wardrobe', 'closet'],
    shortDescription: 'Soft-sided linen boxes in three sizes for drawers and shelves.',
    description: 'Three nesting boxes in washed linen over a rigid board core. Use them to divide a dresser drawer, corral chargers on a shelf, or tidy the bathroom cabinet.',
    features: ['Three nesting sizes', 'Washed linen over rigid board', 'Fold flat when not in use'],
    specs: { Material: 'Linen, cardboard core', Dimensions: 'S 20 × 15, M 28 × 20, L 35 × 25 cm', Weight: '0.6 kg (set)', Care: 'Spot clean' },
    images: img('linen-drawer-organizers'), createdAt: '2026-04-11', featured: false, popularity: 63,
  },
  {
    id: 'p008', slug: 'beechwood-dish-brush-set', name: 'Beechwood Dish Brush Set', category: 'cleaning',
    price: 14, compareAtPrice: null, stock: 52, rating: 4.6, reviewCount: 145,
    badges: ['bestseller'], tags: ['brush', 'dishes', 'plastic-free', 'sisal', 'washing up'],
    shortDescription: 'A long-handled dish brush and a pot scrubber in oiled beech and plant fibre.',
    description: 'Oiled beechwood handles with firm plant-fibre bristles that stand up to baked-on pans without scratching. The long brush has a replaceable head — order refills instead of a new brush.',
    features: ['Replaceable brush head', 'Firm plant-fibre bristles', 'Plastic-free'],
    specs: { Material: 'Beechwood, tampico fibre', Dimensions: 'Brush 26 cm, scrubber Ø 8 cm', Weight: '0.2 kg', Care: 'Rinse and air dry, head down' },
    images: img('beechwood-dish-brush-set'), createdAt: '2026-01-20', featured: true, popularity: 88,
  },
  {
    id: 'p009', slug: 'refillable-glass-spray-bottle', name: 'Refillable Glass Spray Bottle', category: 'cleaning',
    price: 12, compareAtPrice: null, stock: 40, rating: 4.3, reviewCount: 52,
    badges: ['new'], tags: ['spray', 'glass', 'refill', 'cleaner', 'zero waste'],
    shortDescription: 'A heavy glass bottle with a fine-mist trigger, made to be refilled for years.',
    description: 'Thick 500 ml glass with a comfortable trigger grip and an adjustable mist-to-stream trigger. Pair it with any concentrate or a simple vinegar mix — and stop buying plastic bottles.',
    features: ['500 ml thick glass', 'Adjustable mist / stream', 'Chemical-resistant trigger', 'Includes write-on label'],
    specs: { Material: 'Soda-lime glass, PP trigger', Dimensions: 'Ø 7 × 24 cm', Weight: '0.45 kg', Care: 'Rinse between refills' },
    images: img('refillable-glass-spray-bottle'), createdAt: '2026-09-02', featured: false, popularity: 60,
  },
  {
    id: 'p010', slug: 'microfiber-cloth-pack', name: 'Microfiber Cloth Pack of 12', category: 'cleaning',
    price: 16, compareAtPrice: 20, stock: 66, rating: 4.5, reviewCount: 98,
    badges: [], tags: ['cloths', 'dusting', 'glass', 'kitchen', 'towels'],
    shortDescription: 'Twelve lint-free cloths in six muted colours — one per room.',
    description: 'Dense 320 gsm microfiber that lifts dust and grease with just water. Colour-code by room so the bathroom cloth never ends up in the kitchen.',
    features: ['12 cloths, 6 colours', '320 gsm, lint-free', 'Machine washable 500+ times'],
    specs: { Material: '80% polyester, 20% polyamide', Dimensions: '30 × 30 cm each', Weight: '0.5 kg', Care: 'Machine wash 60°C, no softener' },
    images: img('microfiber-cloth-pack'), createdAt: '2026-03-28', featured: false, popularity: 69,
  },
  {
    id: 'p011', slug: 'terrazzo-soap-dispenser', name: 'Terrazzo Soap Dispenser', category: 'bathroom',
    price: 19, compareAtPrice: null, stock: 21, rating: 4.6, reviewCount: 73,
    badges: [], tags: ['soap', 'pump', 'sink', 'stone', 'lotion'],
    shortDescription: 'A cast terrazzo dispenser with a brushed-steel pump.',
    description: 'Cast from resin-bound stone chips for a classic terrazzo look, with a weighty base and a rust-resistant brushed-steel pump. Holds 350 ml of hand soap or lotion.',
    features: ['350 ml capacity', 'Rust-resistant steel pump', 'Non-slip base'],
    specs: { Material: 'Resin terrazzo, stainless steel', Dimensions: 'Ø 8 × 18 cm', Weight: '0.7 kg', Care: 'Wipe clean' },
    images: img('terrazzo-soap-dispenser'), createdAt: '2026-05-30', featured: true, popularity: 79,
  },
  {
    id: 'p012', slug: 'waffle-cotton-bath-towel', name: 'Waffle Cotton Bath Towel', category: 'bathroom',
    price: 26, compareAtPrice: null, stock: 3, rating: 4.8, reviewCount: 112,
    badges: ['bestseller'], tags: ['towel', 'cotton', 'waffle', 'quick dry', 'bath'],
    shortDescription: 'A light, quick-drying waffle towel that gets softer with every wash.',
    description: 'Woven from long-staple cotton in a deep waffle weave that absorbs fast and dries fast — ideal for humid coastal apartments. Lighter than terry, softer every wash.',
    features: ['Long-staple cotton', 'Quick-drying waffle weave', 'Hanging loop'],
    specs: { Material: '100% cotton, 420 gsm', Dimensions: '70 × 140 cm', Weight: '0.45 kg', Care: 'Machine wash 40°C' },
    images: img('waffle-cotton-bath-towel'), createdAt: '2026-02-24', featured: true, popularity: 85,
  },
  {
    id: 'p013', slug: 'bamboo-bath-caddy', name: 'Bamboo Bath Caddy', category: 'bathroom',
    price: 35, compareAtPrice: 42, stock: 12, rating: 4.5, reviewCount: 29,
    badges: [], tags: ['tray', 'bathtub', 'bamboo', 'spa', 'shelf'],
    shortDescription: 'An extendable bamboo tray that turns the tub into a slow evening.',
    description: 'Water-resistant lacquered bamboo with sliding arms that fit tubs from 70 to 105 cm wide. Room for a book, a candle and a cup of tea.',
    features: ['Extends from 70 to 105 cm', 'Water-resistant lacquer', 'Non-slip silicone grips'],
    specs: { Material: 'Lacquered bamboo, silicone', Dimensions: '70–105 × 22 × 4 cm', Weight: '1.5 kg', Care: 'Wipe dry after use' },
    images: img('bamboo-bath-caddy'), createdAt: '2026-08-08', featured: false, popularity: 58,
  },
  {
    id: 'p014', slug: 'ribbed-glass-vase', name: 'Ribbed Glass Vase', category: 'home',
    price: 31, compareAtPrice: null, stock: 19, rating: 4.7, reviewCount: 47,
    badges: ['new'], tags: ['vase', 'flowers', 'glass', 'decor', 'stems'],
    shortDescription: 'Mouth-blown ribbed glass that flatters a single branch or a full bunch.',
    description: 'Mouth-blown with fine vertical ribs that soften the stems inside. A narrow neck holds a single olive branch upright; the full body takes a market bunch.',
    features: ['Mouth-blown glass', 'Each piece slightly unique', 'Watertight'],
    specs: { Material: 'Mouth-blown glass', Dimensions: 'Ø 14 × 22 cm', Weight: '0.8 kg', Care: 'Hand wash' },
    images: img('ribbed-glass-vase'), createdAt: '2026-09-25', featured: true, popularity: 76,
  },
  {
    id: 'p015', slug: 'cedar-fig-soy-candle', name: 'Cedar & Fig Soy Candle', category: 'home',
    price: 18, compareAtPrice: null, stock: 45, rating: 4.9, reviewCount: 167,
    badges: ['bestseller'], tags: ['candle', 'scent', 'soy', 'fragrance', 'gift'],
    shortDescription: 'Cedarwood, ripe fig and a little smoke, poured in an amber glass jar.',
    description: 'Hand-poured soy wax with a cotton wick and a scent of cedarwood, green fig and soft smoke — a mountain evening in a jar. Burns for around 45 hours.',
    features: ['100% soy wax, cotton wick', 'Approx. 45-hour burn', 'Reusable amber jar'],
    specs: { Material: 'Soy wax, amber glass', Dimensions: 'Ø 8 × 10 cm', Weight: '0.4 kg', Care: 'Trim wick to 5 mm before lighting' },
    images: img('cedar-fig-soy-candle'), createdAt: '2026-07-04', featured: true, popularity: 91,
  },
  {
    id: 'p016', slug: 'linen-cushion-cover', name: 'Stonewashed Linen Cushion Cover', category: 'home',
    price: 21, compareAtPrice: null, stock: 33, rating: 4.4, reviewCount: 39,
    badges: [], tags: ['cushion', 'pillow', 'linen', 'sofa', 'textile'],
    shortDescription: 'A relaxed stonewashed linen cover with a hidden zip.',
    description: 'European flax linen, stonewashed for a soft, lived-in hand from day one. A concealed zip keeps the front clean; fits a standard 50 × 50 cm insert (not included).',
    features: ['Stonewashed European linen', 'Concealed zip', 'Fits 50 × 50 cm insert'],
    specs: { Material: '100% linen', Dimensions: '50 × 50 cm', Weight: '0.2 kg', Care: 'Machine wash 30°C' },
    images: img('linen-cushion-cover'), createdAt: '2026-06-19', featured: false, popularity: 66,
  },
];
