/* ═══════════════════════════════════════════════════════════════
   CEDARLINE — PRODUCT CATALOG (fictional demo data)
   ───────────────────────────────────────────────────────────────
   This file is the stand-in for a products table. Keep the shape
   when moving to a database (or mapping from Shopify) — the UI only
   depends on these fields:

     id              stable unique id (string)
     slug            URL id → product.html?id=<slug>
     name, category  category = an id from categories.js
     brand           an id from brands.js
     price           store currency, e.g. 34 or 34.5
     compareAtPrice  original price when on sale, else null
     stock           units available (0 = sold out)
     rating, reviewCount
     badges          any of 'bestseller' | 'new'
     tags            extra search keywords
     images          [main, close-up] in assets/products/ (or URLs)
     cutout          transparent image for banners (optional)
     createdAt       ISO date — drives "Newest" sorting
     featured        shown in home-page highlights
     popularity      0–100 — drives "Featured" sorting
   ═══════════════════════════════════════════════════════════════ */

const art = (slug) => ({
  images: [`assets/products/${slug}-1.svg`, `assets/products/${slug}-2.svg`],
  cutout: `assets/products/${slug}-t.svg`,
});

export const PRODUCTS = [
  /* ── Cookware ─────────────────────────────────────────────── */
  {
    id: 'p001', slug: 'granite-cookware-set', name: 'Granite Non-Stick Cookware Set, 5 pcs', category: 'cookware', brand: 'ferrano',
    price: 49.99, compareAtPrice: 62.99, stock: 14, rating: 4.7, reviewCount: 1256, badges: ['bestseller'],
    tags: ['pots', 'pans', 'granite', 'non-stick', 'saucepan', 'set'],
    shortDescription: 'Two casseroles and a saucepan with lids, coated in a speckled granite finish.',
    description: 'A complete starter set for a family kitchen: 20 cm and 24 cm casseroles with glass-free granite lids and a 16 cm saucepan. The PFOA-free granite coating releases food easily, and the thick aluminium base heats evenly on gas, electric and induction.',
    features: ['5 pieces: 2 casseroles, 1 saucepan, 2 lids', 'PFOA-free granite coating', 'Induction-ready base', 'Stay-cool wood-effect knobs'],
    specs: { Material: 'Cast aluminium, granite coating', Sizes: '16 / 20 / 24 cm', Hobs: 'Gas, electric, induction', Care: 'Hand wash recommended' },
    ...art('granite-cookware-set'), createdAt: '2026-04-02', featured: true, popularity: 97,
  },
  {
    id: 'p002', slug: 'granite-frying-pan', name: 'Granite Frying Pan, 28 cm', category: 'cookware', brand: 'ferrano',
    price: 24.99, compareAtPrice: 29.99, stock: 32, rating: 4.6, reviewCount: 842, badges: [],
    tags: ['frying pan', 'skillet', 'eggs', 'non-stick', 'granite'],
    shortDescription: 'A wide, deep non-stick pan for eggs, manakish toppings and weeknight stir-fries.',
    description: 'A 28 cm pan with a 5 cm wall, so it handles a full family breakfast without spilling. The granite coating needs very little oil, and the riveted soft-touch handle stays cool on the hob.',
    features: ['28 cm diameter, 5 cm deep', 'Needs little or no oil', 'Riveted soft-touch handle', 'Induction-ready'],
    specs: { Material: 'Forged aluminium, granite coating', Size: '28 cm', Weight: '1.1 kg', Care: 'Hand wash, no metal utensils' },
    ...art('granite-frying-pan'), createdAt: '2026-06-11', featured: false, popularity: 84,
  },
  {
    id: 'p003', slug: 'cast-iron-casserole', name: 'Enamelled Cast Iron Casserole, 4.5 L', category: 'cookware', brand: 'ferrano',
    price: 69, compareAtPrice: null, stock: 6, rating: 4.9, reviewCount: 311, badges: ['new'],
    tags: ['dutch oven', 'stew', 'cast iron', 'enamel', 'oven'],
    shortDescription: 'Heavy enamelled cast iron for slow stews, rice dishes and oven-baked bread.',
    description: 'Cast iron holds and spreads heat for long, gentle cooking — ideal for fasolia, mloukhieh or a Sunday roast. The enamel needs no seasoning and the tight lid keeps moisture in. Oven-safe to 250 °C.',
    features: ['4.5 L, serves 4–6', 'No seasoning needed', 'Oven-safe to 250 °C', 'Self-basting lid'],
    specs: { Material: 'Enamelled cast iron', Size: '24 cm, 4.5 L', Weight: '4.6 kg', Care: 'Hand wash, dry fully' },
    ...art('cast-iron-casserole'), createdAt: '2026-09-20', featured: true, popularity: 80,
  },

  /* ── Bakeware ─────────────────────────────────────────────── */
  {
    id: 'p004', slug: 'nonstick-baking-tray-set', name: 'Non-Stick Baking Tray Set of 2', category: 'bakeware', brand: 'bakeline',
    price: 18.99, compareAtPrice: 22.99, stock: 40, rating: 4.5, reviewCount: 420, badges: [],
    tags: ['tray', 'oven', 'cookies', 'roasting', 'sheet pan'],
    shortDescription: 'Two warp-resistant carbon-steel trays for cookies, roast vegetables and kaak.',
    description: 'Heavy-gauge carbon steel that resists warping at high heat, with a non-stick coating that releases cookies and roast potatoes cleanly. Sized to fit standard Lebanese ovens.',
    features: ['Set of 2: 38 × 26 cm and 33 × 23 cm', 'Warp-resistant carbon steel', 'Oven-safe to 230 °C'],
    specs: { Material: 'Carbon steel, non-stick coating', Sizes: '38 × 26 cm, 33 × 23 cm', Weight: '1.2 kg', Care: 'Hand wash' },
    ...art('nonstick-baking-tray-set'), createdAt: '2026-03-15', featured: false, popularity: 70,
  },
  {
    id: 'p005', slug: 'muffin-pan-12', name: '12-Cup Muffin Pan', category: 'bakeware', brand: 'bakeline',
    price: 14.99, compareAtPrice: null, stock: 25, rating: 4.6, reviewCount: 233, badges: [],
    tags: ['muffin', 'cupcake', 'baking', 'tin'],
    shortDescription: 'A non-stick tin for muffins, cupcakes and mini egg bites.',
    description: 'Twelve deep cups with a non-stick coating and wide handles you can grip with oven gloves. Bakes evenly from the centre to the corners.',
    features: ['12 standard cups', 'Wide grip handles', 'Dishwasher safe'],
    specs: { Material: 'Carbon steel, non-stick coating', Size: '35 × 27 cm', Weight: '0.7 kg', Care: 'Dishwasher safe' },
    ...art('muffin-pan-12'), createdAt: '2026-05-08', featured: false, popularity: 62,
  },
  {
    id: 'p006', slug: 'springform-cake-pan', name: 'Springform Cake Pan, 24 cm', category: 'bakeware', brand: 'bakeline',
    price: 16.5, compareAtPrice: 19.5, stock: 18, rating: 4.4, reviewCount: 178, badges: [],
    tags: ['cake', 'cheesecake', 'springform', 'tin'],
    shortDescription: 'A leak-resistant springform tin for cheesecakes and layer cakes.',
    description: 'A tight-locking clasp and a grooved base keep batter in, then release the sides cleanly so delicate cakes come out whole.',
    features: ['24 cm, 7 cm deep', 'Leak-resistant base', 'Quick-release clasp'],
    specs: { Material: 'Carbon steel, non-stick coating', Size: '24 cm', Weight: '0.6 kg', Care: 'Hand wash' },
    ...art('springform-cake-pan'), createdAt: '2026-02-19', featured: false, popularity: 55,
  },

  /* ── Kitchen tools ────────────────────────────────────────── */
  {
    id: 'p007', slug: 'stainless-knife-set', name: 'Stainless Steel Knife Set, 6 pcs', category: 'kitchen-tools', brand: 'oakhurst',
    price: 16.99, compareAtPrice: 19.99, stock: 50, rating: 4.5, reviewCount: 895, badges: ['bestseller'],
    tags: ['knives', 'chef knife', 'bread knife', 'paring', 'steel'],
    shortDescription: 'Chef, bread, carving, utility and paring knives plus kitchen scissors.',
    description: 'Six essential blades in high-carbon stainless steel, sharpened to a 15° edge and balanced with full-tang riveted handles. Everything you need, without the drawer clutter.',
    features: ['Chef, bread, carving, utility, paring, scissors', 'High-carbon stainless steel', 'Full-tang riveted handles'],
    specs: { Material: 'X50CrMoV15 steel, ABS handles', 'Longest blade': '20 cm', Weight: '1.0 kg', Care: 'Hand wash, dry immediately' },
    ...art('stainless-knife-set'), createdAt: '2026-01-27', featured: true, popularity: 92,
  },
  {
    id: 'p008', slug: 'silicone-utensil-set', name: 'Silicone Utensil Set with Holder, 7 pcs', category: 'kitchen-tools', brand: 'oakhurst',
    price: 21.99, compareAtPrice: 27.99, stock: 28, rating: 4.7, reviewCount: 640, badges: [],
    tags: ['utensils', 'spatula', 'ladle', 'whisk', 'silicone', 'holder'],
    shortDescription: 'Heat-safe silicone heads on acacia handles, in a matching holder.',
    description: 'Spatula, ladle, slotted spoon, whisk, turner and spoon with heat-safe silicone heads that won’t scratch non-stick pans. Stored in a weighted ceramic holder.',
    features: ['6 utensils + holder', 'Heat-safe to 230 °C', 'Safe on non-stick coatings'],
    specs: { Material: 'Food-grade silicone, acacia, ceramic', Length: '30–33 cm', Weight: '1.3 kg', Care: 'Heads dishwasher safe' },
    ...art('silicone-utensil-set'), createdAt: '2026-07-14', featured: true, popularity: 86,
  },
  {
    id: 'p009', slug: 'acacia-cutting-board-set', name: 'Acacia Cutting Board Set of 3', category: 'kitchen-tools', brand: 'oakhurst',
    price: 24.99, compareAtPrice: 32.99, stock: 22, rating: 4.6, reviewCount: 754, badges: [],
    tags: ['cutting board', 'chopping', 'wood', 'serving', 'acacia'],
    shortDescription: 'Three solid acacia boards, from herbs and lemons to a full roast.',
    description: 'Small, medium and large boards in solid acacia, finished with food-safe oil. Each has a hanging handle and works as a serving board for cheese, fruit or mezze.',
    features: ['Small, medium and large', 'Solid acacia wood', 'Doubles as serving boards'],
    specs: { Material: 'Acacia wood, mineral oil', Sizes: '30, 38, 45 cm', Weight: '2.4 kg (set)', Care: 'Hand wash, oil monthly' },
    ...art('acacia-cutting-board-set'), createdAt: '2026-04-21', featured: true, popularity: 83,
  },

  /* ── Storage & organization ──────────────────────────────── */
  {
    id: 'p010', slug: 'revolving-spice-rack', name: 'Revolving Spice Rack with 16 Jars', category: 'storage', brand: 'saffra',
    price: 24.99, compareAtPrice: 32.99, stock: 16, rating: 4.6, reviewCount: 1102, badges: ['bestseller'],
    tags: ['spice rack', 'spices', 'jars', 'carousel', 'zaatar', 'sumac'],
    shortDescription: 'Sixteen glass jars on a two-tier carousel — every spice one spin away.',
    description: 'Two rotating tiers keep seven-spice, sumac, za’atar and cumin visible and within reach. Glass jars with steel shaker lids, plus 32 printed and blank labels.',
    features: ['16 glass jars, 100 ml each', 'Two-tier 360° carousel', 'Shaker inserts and steel lids', '32 labels included'],
    specs: { Material: 'Glass, stainless steel', Dimensions: 'Ø 22 × 33 cm', Weight: '2.1 kg', Care: 'Jars dishwasher safe' },
    ...art('revolving-spice-rack'), createdAt: '2026-05-25', featured: true, popularity: 90,
  },
  {
    id: 'p011', slug: 'glass-spice-jar-set', name: 'Glass Spice Jar Set of 6', category: 'storage', brand: 'saffra',
    price: 28, compareAtPrice: 35, stock: 18, rating: 4.7, reviewCount: 203, badges: [],
    tags: ['spices', 'jars', 'pantry', 'cork', 'airtight'],
    shortDescription: 'Six airtight glass jars with cork lids for bulk spices and herbs.',
    description: 'Borosilicate jars with natural cork lids lined for an airtight seal. Sized for 100 g refills, with a wide mouth for measuring spoons.',
    features: ['Set of 6 jars, 180 ml each', 'Airtight lined cork lids', 'Wide mouth for spoons'],
    specs: { Material: 'Borosilicate glass, natural cork', Dimensions: 'Ø 5.5 × 11 cm each', Weight: '1.2 kg (set)', Care: 'Jars dishwasher safe' },
    ...art('glass-spice-jar-set'), createdAt: '2026-02-10', featured: false, popularity: 74,
  },
  {
    id: 'p012', slug: 'stackable-pantry-bins', name: 'Stackable Airtight Pantry Bins, Set of 4', category: 'storage', brand: 'saffra',
    price: 32, compareAtPrice: null, stock: 27, rating: 4.5, reviewCount: 364, badges: [],
    tags: ['pantry', 'containers', 'rice', 'bulgur', 'pasta', 'airtight'],
    shortDescription: 'Clear, stackable bins that keep rice, bulgur and pasta fresh through humid summers.',
    description: 'BPA-free clear bins with silicone-sealed lids that lock and stack. See at a glance how much is left, and keep pantry staples dry.',
    features: ['2 × 1.2 L, 2 × 2.4 L', 'Silicone-sealed snap lids', 'BPA-free'],
    specs: { Material: 'BPA-free Tritan, silicone', Dimensions: '24 × 12 × 10 / 20 cm', Weight: '1.3 kg (set)', Care: 'Top-rack dishwasher safe' },
    ...art('stackable-pantry-bins'), createdAt: '2026-06-03', featured: false, popularity: 72,
  },

  /* ── Tableware ────────────────────────────────────────────── */
  {
    id: 'p013', slug: 'stoneware-dinner-set', name: 'Stoneware Dinner Set, 12 pcs', category: 'tableware', brand: 'porcelia',
    price: 59, compareAtPrice: 74, stock: 9, rating: 4.8, reviewCount: 287, badges: [],
    tags: ['plates', 'bowls', 'dinnerware', 'stoneware', 'set'],
    shortDescription: 'Dinner plates, side plates and bowls for four, with a fine charcoal rim.',
    description: 'Speckled cream stoneware with a hand-painted charcoal rim. Chip-resistant, microwave and dishwasher safe — made for daily use, smart enough for guests.',
    features: ['4 dinner plates, 4 side plates, 4 bowls', 'Chip-resistant stoneware', 'Microwave & dishwasher safe'],
    specs: { Material: 'Glazed stoneware', Sizes: '27 / 21 / 15 cm', Weight: '7.8 kg', Care: 'Dishwasher safe' },
    ...art('stoneware-dinner-set'), createdAt: '2026-08-02', featured: false, popularity: 77,
  },
  {
    id: 'p014', slug: 'matte-serving-bowls', name: 'Matte Serving Bowls, Set of 3', category: 'tableware', brand: 'porcelia',
    price: 27, compareAtPrice: null, stock: 20, rating: 4.5, reviewCount: 96, badges: ['new'],
    tags: ['bowls', 'salad', 'serving', 'ceramic'],
    shortDescription: 'Three nesting bowls in charcoal, sand and white for salads and sides.',
    description: 'Large, medium and small bowls in a soft matte glaze. They nest for storage and work together on a busy table — fattoush, rice and yoghurt side by side.',
    features: ['Three nesting sizes', 'Matte glaze, glossy interior', 'Dishwasher safe'],
    specs: { Material: 'Ceramic', Sizes: 'Ø 26 / 20 / 15 cm', Weight: '3.2 kg', Care: 'Dishwasher safe' },
    ...art('matte-serving-bowls'), createdAt: '2026-09-28', featured: false, popularity: 60,
  },
  {
    id: 'p015', slug: 'mezze-serving-set', name: 'Mezze Serving Set, Tray + 4 Dishes', category: 'tableware', brand: 'porcelia',
    price: 34, compareAtPrice: 42, stock: 12, rating: 4.9, reviewCount: 412, badges: ['bestseller'],
    tags: ['mezze', 'hummus', 'labneh', 'olives', 'tray', 'serving'],
    shortDescription: 'An acacia tray with four porcelain dishes for hummus, labneh, olives and tabbouleh.',
    description: 'Built for the Lebanese table: four shallow porcelain dishes sit in a raised acacia tray, so a full mezze moves from kitchen to table in one trip.',
    features: ['Acacia tray + 4 porcelain dishes', 'Dishes dishwasher safe', 'Great as a gift'],
    specs: { Material: 'Acacia wood, porcelain', Tray: '40 × 25 cm', Dishes: 'Ø 12 cm', Care: 'Wipe tray; dishes dishwasher safe' },
    ...art('mezze-serving-set'), createdAt: '2026-07-30', featured: true, popularity: 89,
  },

  /* ── Drinkware ────────────────────────────────────────────── */
  {
    id: 'p016', slug: 'ceramic-mug-set', name: 'Ceramic Mug Set of 4', category: 'drinkware', brand: 'thermique',
    price: 22, compareAtPrice: null, stock: 35, rating: 4.6, reviewCount: 318, badges: [],
    tags: ['mugs', 'coffee', 'tea', 'cups', 'ceramic'],
    shortDescription: 'Four 350 ml mugs in charcoal, cream and sand for coffee and tea.',
    description: 'Thick-walled ceramic that keeps drinks warm, with a comfortable full-hand handle. A neutral mix that suits any kitchen shelf.',
    features: ['4 mugs, 350 ml each', 'Thick, heat-holding walls', 'Microwave & dishwasher safe'],
    specs: { Material: 'Ceramic', Capacity: '350 ml', Weight: '1.6 kg (set)', Care: 'Dishwasher safe' },
    ...art('ceramic-mug-set'), createdAt: '2026-03-03', featured: false, popularity: 68,
  },
  {
    id: 'p017', slug: 'insulated-steel-bottle', name: 'Insulated Steel Bottle, 1 L', category: 'drinkware', brand: 'thermique',
    price: 13.59, compareAtPrice: 15.99, stock: 60, rating: 4.7, reviewCount: 1654, badges: ['bestseller'],
    tags: ['bottle', 'flask', 'thermos', 'water', 'insulated'],
    shortDescription: 'Keeps water cold for 24 hours and tea hot for 12 — beach, office or school.',
    description: 'Double-wall vacuum-insulated stainless steel with a leak-proof cap and carry loop. No sweating, no metallic taste.',
    features: ['1 litre', 'Cold 24 h / hot 12 h', 'Leak-proof cap', 'BPA-free'],
    specs: { Material: '18/8 stainless steel', Capacity: '1 L', Weight: '0.45 kg', Care: 'Hand wash' },
    ...art('insulated-steel-bottle'), createdAt: '2026-05-17', featured: true, popularity: 88,
  },
  {
    id: 'p018', slug: 'matte-ceramic-pour-over-set', name: 'Matte Ceramic Pour-Over Set', category: 'drinkware', brand: 'thermique',
    price: 46, compareAtPrice: null, stock: 0, rating: 4.9, reviewCount: 41, badges: [],
    tags: ['coffee', 'dripper', 'carafe', 'brew'],
    shortDescription: 'Charcoal ceramic dripper and glass carafe for a slow, even cup.',
    description: 'A matte ceramic dripper that holds heat for an even extraction, paired with a 600 ml heat-resistant glass carafe. Takes standard size 02 cone filters.',
    features: ['Ceramic dripper holds heat', '600 ml glass carafe', 'Fits size 02 filters'],
    specs: { Material: 'Ceramic, borosilicate glass', Capacity: '600 ml', Weight: '0.9 kg', Care: 'Dishwasher safe' },
    ...art('matte-ceramic-pour-over-set'), createdAt: '2026-07-21', featured: false, popularity: 64,
  },

  /* ── Appliances ───────────────────────────────────────────── */
  {
    id: 'p019', slug: 'digital-air-fryer', name: 'Digital Air Fryer 4.2 L', category: 'appliances', brand: 'zestro',
    price: 59.99, compareAtPrice: 85.99, stock: 11, rating: 4.7, reviewCount: 2366, badges: ['bestseller'],
    tags: ['air fryer', 'fries', 'chicken', 'oil-free', 'appliance'],
    shortDescription: 'Crispy fries and chicken with a spoon of oil, from a simple touch panel.',
    description: 'A 4.2 L basket fits a family portion, and eight presets take the guesswork out of fries, wings, fish and vegetables. Uses far less power than a full oven — handy on generator hours.',
    features: ['4.2 L non-stick basket', '8 one-touch presets', '80–200 °C, 60-minute timer', '1500 W'],
    specs: { Power: '1500 W, 220–240 V', Capacity: '4.2 L', Weight: '4.3 kg', Warranty: '1 year' },
    ...art('digital-air-fryer'), createdAt: '2026-08-19', featured: true, popularity: 95,
  },
  {
    id: 'p020', slug: 'glass-electric-kettle', name: 'Glass Electric Kettle, 1.7 L', category: 'appliances', brand: 'zestro',
    price: 34.99, compareAtPrice: null, stock: 19, rating: 4.5, reviewCount: 506, badges: [],
    tags: ['kettle', 'tea', 'boil', 'water', 'appliance'],
    shortDescription: 'A borosilicate glass kettle that boils 1.7 L fast and glows while it heats.',
    description: 'Fast-boil 2200 W element, auto shut-off and boil-dry protection. The removable limescale filter keeps tea clear in hard-water areas.',
    features: ['1.7 L borosilicate glass', 'Auto shut-off & boil-dry protection', 'Removable limescale filter'],
    specs: { Power: '2200 W, 220–240 V', Capacity: '1.7 L', Weight: '1.2 kg', Warranty: '1 year' },
    ...art('glass-electric-kettle'), createdAt: '2026-06-28', featured: false, popularity: 69,
  },
  {
    id: 'p021', slug: 'personal-blender', name: 'Personal Blender with 2 Bottles', category: 'appliances', brand: 'zestro',
    price: 29.99, compareAtPrice: 39.99, stock: 3, rating: 4.4, reviewCount: 389, badges: ['new'],
    tags: ['blender', 'smoothie', 'juice', 'bottle', 'appliance'],
    shortDescription: 'Blend smoothies straight into a travel bottle — one button, no jug to wash.',
    description: 'A compact 350 W motor with stainless blades and two 600 ml bottles with travel lids. Blend, twist off and go.',
    features: ['350 W motor', '2 × 600 ml bottles with lids', 'One-touch pulse'],
    specs: { Power: '350 W, 220–240 V', Capacity: '2 × 600 ml', Weight: '1.4 kg', Warranty: '1 year' },
    ...art('personal-blender'), createdAt: '2026-10-01', featured: false, popularity: 66,
  },

  /* ── Cleaning essentials ──────────────────────────────────── */
  {
    id: 'p022', slug: 'beechwood-dish-brush-set', name: 'Beechwood Dish Brush Set', category: 'cleaning', brand: 'purely',
    price: 14, compareAtPrice: null, stock: 52, rating: 4.6, reviewCount: 145, badges: [],
    tags: ['brush', 'dishes', 'plastic-free', 'washing up'],
    shortDescription: 'A long-handled dish brush and a pot scrubber in oiled beech and plant fibre.',
    description: 'Firm plant-fibre bristles stand up to baked-on pans without scratching. The long brush has a replaceable head — order refills instead of a new brush.',
    features: ['Replaceable brush head', 'Firm plant-fibre bristles', 'Plastic-free'],
    specs: { Material: 'Beechwood, tampico fibre', Size: 'Brush 26 cm, scrubber Ø 8 cm', Weight: '0.2 kg', Care: 'Rinse and air dry' },
    ...art('beechwood-dish-brush-set'), createdAt: '2026-01-20', featured: false, popularity: 61,
  },
  {
    id: 'p023', slug: 'microfiber-cloth-pack', name: 'Microfiber Cloth Pack of 12', category: 'cleaning', brand: 'purely',
    price: 9.99, compareAtPrice: 12.99, stock: 66, rating: 4.5, reviewCount: 980, badges: [],
    tags: ['cloths', 'dusting', 'glass', 'towels', 'kitchen'],
    shortDescription: 'Twelve lint-free cloths in six colours — one per job.',
    description: 'Dense 320 gsm microfiber that lifts grease and dust with just water. Colour-code by task so the counter cloth never meets the floor.',
    features: ['12 cloths, 6 colours', '320 gsm, lint-free', 'Machine washable 500+ times'],
    specs: { Material: '80% polyester, 20% polyamide', Size: '30 × 30 cm', Weight: '0.5 kg', Care: 'Machine wash 60 °C' },
    ...art('microfiber-cloth-pack'), createdAt: '2026-03-28', featured: false, popularity: 71,
  },
  {
    id: 'p024', slug: 'refillable-glass-spray-bottle', name: 'Refillable Glass Spray Bottle', category: 'cleaning', brand: 'purely',
    price: 12, compareAtPrice: null, stock: 40, rating: 4.3, reviewCount: 152, badges: [],
    tags: ['spray', 'glass', 'refill', 'cleaner', 'zero waste'],
    shortDescription: 'A heavy glass bottle with a fine-mist trigger, made to be refilled for years.',
    description: 'Thick 500 ml glass with an adjustable mist-to-stream trigger. Pair it with any concentrate or a simple vinegar mix.',
    features: ['500 ml thick glass', 'Adjustable mist / stream', 'Chemical-resistant trigger'],
    specs: { Material: 'Soda-lime glass, PP trigger', Capacity: '500 ml', Weight: '0.45 kg', Care: 'Rinse between refills' },
    ...art('refillable-glass-spray-bottle'), createdAt: '2026-09-02', featured: false, popularity: 58,
  },
];
