-- ═══════════════════════════════════════════════════════════════
-- Cedarline — seed data (GENERATED — do not edit by hand)
-- Source: shop/js/data/*.js and shop/js/config.js
-- Regenerate: node scripts/supabase/export-seed.mjs
-- 24 products · 8 categories · 8 brands · 8 delivery zones · 2 promotions
-- Safe to re-run: existing rows are left untouched.
-- ═══════════════════════════════════════════════════════════════
begin;

-- ── Store settings ────────────────────────────────────────────
insert into public.store_settings (id, name, tagline, about, email, phone, whatsapp, address, hours, currency_code, lbp_rate, free_delivery_threshold_cents, delivery_eta_text, max_qty_per_line) values
  (true, 'Cedarline', 'Cook better. Live better.', 'Kitchen essentials for Lebanese homes — delivered across all eight governorates.', 'hello@cedarline.example', '+961 70 991 555', '+961 70 991 555', 'Hamra Street, Beirut, Lebanon', 'Mon–Sat, 9:00–18:00', 'USD', 89500, 7500, '1–3 working days', 10)
on conflict (id) do nothing;

-- ── Categories ────────────────────────────────────────────────
insert into public.categories (id, name, blurb, icon_url, sort_order) values
  ('cookware', 'Cookware', 'Granite pans, pots and cast iron for everyday cooking.', 'assets/products/granite-cookware-set-t.svg', 1),
  ('bakeware', 'Bakeware', 'Trays, tins and pans for bread, cakes and kaak.', 'assets/products/nonstick-baking-tray-set-t.svg', 2),
  ('kitchen-tools', 'Kitchen Tools', 'Knives, boards and utensils that do the hard work.', 'assets/products/silicone-utensil-set-t.svg', 3),
  ('storage', 'Storage & Organization', 'Jars, racks and bins for a calm, tidy pantry.', 'assets/products/glass-spice-jar-set-t.svg', 4),
  ('tableware', 'Tableware', 'Plates, bowls and mezze sets for the family table.', 'assets/products/stoneware-dinner-set-t.svg', 5),
  ('drinkware', 'Drinkware', 'Mugs, bottles and coffee gear for every cup.', 'assets/products/ceramic-mug-set-t.svg', 6),
  ('appliances', 'Appliances', 'Air fryers, kettles and blenders that save time.', 'assets/products/personal-blender-t.svg', 7),
  ('cleaning', 'Cleaning Essentials', 'Brushes, cloths and refillable bottles.', 'assets/products/refillable-glass-spray-bottle-t.svg', 8)
on conflict (id) do nothing;

-- ── Brands ────────────────────────────────────────────────────
insert into public.brands (id, name, about, logo_url, sort_order) values
  ('ferrano', 'Ferrano', 'Granite-coated and cast-iron cookware built for high heat.', 'assets/brands/ferrano.svg', 1),
  ('bakeline', 'Bakeline', 'Carbon-steel bakeware with a release coating that lasts.', 'assets/brands/bakeline.svg', 2),
  ('oakhurst', 'Oakhurst', 'Knives, boards and tools in steel and solid wood.', 'assets/brands/oakhurst.svg', 3),
  ('saffra', 'Saffra', 'Glass storage and spice organisation for busy pantries.', 'assets/brands/saffra.svg', 4),
  ('porcelia', 'Porcelia', 'Stoneware and ceramic tableware for everyday hosting.', 'assets/brands/porcelia.svg', 5),
  ('thermique', 'Thermique', 'Mugs, bottles and coffee gear that keep the temperature right.', 'assets/brands/thermique.svg', 6),
  ('zestro', 'Zestro', 'Compact kitchen appliances with simple controls.', 'assets/brands/zestro.svg', 7),
  ('purely', 'Purely', 'Plastic-light cleaning tools made to be refilled and reused.', 'assets/brands/purely.svg', 8)
on conflict (id) do nothing;

-- ── Delivery zones ────────────────────────────────────────────
insert into public.delivery_zones (id, name, fee_cents, eta, sort_order) values
  ('beirut', 'Beirut', 300, '1–2 working days', 1),
  ('mount-lebanon', 'Mount Lebanon', 400, '1–2 working days', 2),
  ('north', 'North', 500, '2–3 working days', 3),
  ('akkar', 'Akkar', 600, '2–4 working days', 4),
  ('bekaa', 'Bekaa', 500, '2–3 working days', 5),
  ('baalbek-hermel', 'Baalbek-Hermel', 600, '2–4 working days', 6),
  ('south', 'South', 500, '2–3 working days', 7),
  ('nabatieh', 'Nabatieh', 500, '2–3 working days', 8)
on conflict (id) do nothing;

-- ── Promotions ────────────────────────────────────────────────
insert into public.promotions (code, label, kind, percent_off, amount_off_cents, min_subtotal_cents) values
  ('WELCOME10', '10% off your order', 'percent', 10, null, 0),
  ('BEIRUT5', '$5 off orders over $40', 'fixed', null, 500, 4000)
on conflict (code) do nothing;

-- ── Products (ids, slugs and prices exactly as on the storefront) ────
insert into public.products (id, slug, name, category_id, brand_id, price_cents, compare_at_cents, stock, rating, review_count, badges, tags, short_description, description, features, specs, cutout_url, featured, popularity, listed_on) values
  ('p001', 'granite-cookware-set', 'Granite Non-Stick Cookware Set, 5 pcs', 'cookware', 'ferrano', 4999, 6299, 14, 4.7, 1256, array['bestseller']::text[], array['pots', 'pans', 'granite', 'non-stick', 'saucepan', 'set']::text[], 'Two casseroles and a saucepan with lids, coated in a speckled granite finish.', 'A complete starter set for a family kitchen: 20 cm and 24 cm casseroles with glass-free granite lids and a 16 cm saucepan. The PFOA-free granite coating releases food easily, and the thick aluminium base heats evenly on gas, electric and induction.', array['5 pieces: 2 casseroles, 1 saucepan, 2 lids', 'PFOA-free granite coating', 'Induction-ready base', 'Stay-cool wood-effect knobs']::text[], '{"Material":"Cast aluminium, granite coating","Sizes":"16 / 20 / 24 cm","Hobs":"Gas, electric, induction","Care":"Hand wash recommended"}'::jsonb, 'assets/products/granite-cookware-set-t.svg', true, 97, '2026-04-02'::date),
  ('p002', 'granite-frying-pan', 'Granite Frying Pan, 28 cm', 'cookware', 'ferrano', 2499, 2999, 32, 4.6, 842, '{}'::text[], array['frying pan', 'skillet', 'eggs', 'non-stick', 'granite']::text[], 'A wide, deep non-stick pan for eggs, manakish toppings and weeknight stir-fries.', 'A 28 cm pan with a 5 cm wall, so it handles a full family breakfast without spilling. The granite coating needs very little oil, and the riveted soft-touch handle stays cool on the hob.', array['28 cm diameter, 5 cm deep', 'Needs little or no oil', 'Riveted soft-touch handle', 'Induction-ready']::text[], '{"Material":"Forged aluminium, granite coating","Size":"28 cm","Weight":"1.1 kg","Care":"Hand wash, no metal utensils"}'::jsonb, 'assets/products/granite-frying-pan-t.svg', false, 84, '2026-06-11'::date),
  ('p003', 'cast-iron-casserole', 'Enamelled Cast Iron Casserole, 4.5 L', 'cookware', 'ferrano', 6900, null, 6, 4.9, 311, array['new']::text[], array['dutch oven', 'stew', 'cast iron', 'enamel', 'oven']::text[], 'Heavy enamelled cast iron for slow stews, rice dishes and oven-baked bread.', 'Cast iron holds and spreads heat for long, gentle cooking — ideal for fasolia, mloukhieh or a Sunday roast. The enamel needs no seasoning and the tight lid keeps moisture in. Oven-safe to 250 °C.', array['4.5 L, serves 4–6', 'No seasoning needed', 'Oven-safe to 250 °C', 'Self-basting lid']::text[], '{"Material":"Enamelled cast iron","Size":"24 cm, 4.5 L","Weight":"4.6 kg","Care":"Hand wash, dry fully"}'::jsonb, 'assets/products/cast-iron-casserole-t.svg', true, 80, '2026-09-20'::date),
  ('p004', 'nonstick-baking-tray-set', 'Non-Stick Baking Tray Set of 2', 'bakeware', 'bakeline', 1899, 2299, 40, 4.5, 420, '{}'::text[], array['tray', 'oven', 'cookies', 'roasting', 'sheet pan']::text[], 'Two warp-resistant carbon-steel trays for cookies, roast vegetables and kaak.', 'Heavy-gauge carbon steel that resists warping at high heat, with a non-stick coating that releases cookies and roast potatoes cleanly. Sized to fit standard Lebanese ovens.', array['Set of 2: 38 × 26 cm and 33 × 23 cm', 'Warp-resistant carbon steel', 'Oven-safe to 230 °C']::text[], '{"Material":"Carbon steel, non-stick coating","Sizes":"38 × 26 cm, 33 × 23 cm","Weight":"1.2 kg","Care":"Hand wash"}'::jsonb, 'assets/products/nonstick-baking-tray-set-t.svg', false, 70, '2026-03-15'::date),
  ('p005', 'muffin-pan-12', '12-Cup Muffin Pan', 'bakeware', 'bakeline', 1499, null, 25, 4.6, 233, '{}'::text[], array['muffin', 'cupcake', 'baking', 'tin']::text[], 'A non-stick tin for muffins, cupcakes and mini egg bites.', 'Twelve deep cups with a non-stick coating and wide handles you can grip with oven gloves. Bakes evenly from the centre to the corners.', array['12 standard cups', 'Wide grip handles', 'Dishwasher safe']::text[], '{"Material":"Carbon steel, non-stick coating","Size":"35 × 27 cm","Weight":"0.7 kg","Care":"Dishwasher safe"}'::jsonb, 'assets/products/muffin-pan-12-t.svg', false, 62, '2026-05-08'::date),
  ('p006', 'springform-cake-pan', 'Springform Cake Pan, 24 cm', 'bakeware', 'bakeline', 1650, 1950, 18, 4.4, 178, '{}'::text[], array['cake', 'cheesecake', 'springform', 'tin']::text[], 'A leak-resistant springform tin for cheesecakes and layer cakes.', 'A tight-locking clasp and a grooved base keep batter in, then release the sides cleanly so delicate cakes come out whole.', array['24 cm, 7 cm deep', 'Leak-resistant base', 'Quick-release clasp']::text[], '{"Material":"Carbon steel, non-stick coating","Size":"24 cm","Weight":"0.6 kg","Care":"Hand wash"}'::jsonb, 'assets/products/springform-cake-pan-t.svg', false, 55, '2026-02-19'::date),
  ('p007', 'stainless-knife-set', 'Stainless Steel Knife Set, 6 pcs', 'kitchen-tools', 'oakhurst', 1699, 1999, 50, 4.5, 895, array['bestseller']::text[], array['knives', 'chef knife', 'bread knife', 'paring', 'steel']::text[], 'Chef, bread, carving, utility and paring knives plus kitchen scissors.', 'Six essential blades in high-carbon stainless steel, sharpened to a 15° edge and balanced with full-tang riveted handles. Everything you need, without the drawer clutter.', array['Chef, bread, carving, utility, paring, scissors', 'High-carbon stainless steel', 'Full-tang riveted handles']::text[], '{"Material":"X50CrMoV15 steel, ABS handles","Longest blade":"20 cm","Weight":"1.0 kg","Care":"Hand wash, dry immediately"}'::jsonb, 'assets/products/stainless-knife-set-t.svg', true, 92, '2026-01-27'::date),
  ('p008', 'silicone-utensil-set', 'Silicone Utensil Set with Holder, 7 pcs', 'kitchen-tools', 'oakhurst', 2199, 2799, 28, 4.7, 640, '{}'::text[], array['utensils', 'spatula', 'ladle', 'whisk', 'silicone', 'holder']::text[], 'Heat-safe silicone heads on acacia handles, in a matching holder.', 'Spatula, ladle, slotted spoon, whisk, turner and spoon with heat-safe silicone heads that won’t scratch non-stick pans. Stored in a weighted ceramic holder.', array['6 utensils + holder', 'Heat-safe to 230 °C', 'Safe on non-stick coatings']::text[], '{"Material":"Food-grade silicone, acacia, ceramic","Length":"30–33 cm","Weight":"1.3 kg","Care":"Heads dishwasher safe"}'::jsonb, 'assets/products/silicone-utensil-set-t.svg', true, 86, '2026-07-14'::date),
  ('p009', 'acacia-cutting-board-set', 'Acacia Cutting Board Set of 3', 'kitchen-tools', 'oakhurst', 2499, 3299, 22, 4.6, 754, '{}'::text[], array['cutting board', 'chopping', 'wood', 'serving', 'acacia']::text[], 'Three solid acacia boards, from herbs and lemons to a full roast.', 'Small, medium and large boards in solid acacia, finished with food-safe oil. Each has a hanging handle and works as a serving board for cheese, fruit or mezze.', array['Small, medium and large', 'Solid acacia wood', 'Doubles as serving boards']::text[], '{"Material":"Acacia wood, mineral oil","Sizes":"30, 38, 45 cm","Weight":"2.4 kg (set)","Care":"Hand wash, oil monthly"}'::jsonb, 'assets/products/acacia-cutting-board-set-t.svg', true, 83, '2026-04-21'::date),
  ('p010', 'revolving-spice-rack', 'Revolving Spice Rack with 16 Jars', 'storage', 'saffra', 2499, 3299, 16, 4.6, 1102, array['bestseller']::text[], array['spice rack', 'spices', 'jars', 'carousel', 'zaatar', 'sumac']::text[], 'Sixteen glass jars on a two-tier carousel — every spice one spin away.', 'Two rotating tiers keep seven-spice, sumac, za’atar and cumin visible and within reach. Glass jars with steel shaker lids, plus 32 printed and blank labels.', array['16 glass jars, 100 ml each', 'Two-tier 360° carousel', 'Shaker inserts and steel lids', '32 labels included']::text[], '{"Material":"Glass, stainless steel","Dimensions":"Ø 22 × 33 cm","Weight":"2.1 kg","Care":"Jars dishwasher safe"}'::jsonb, 'assets/products/revolving-spice-rack-t.svg', true, 90, '2026-05-25'::date),
  ('p011', 'glass-spice-jar-set', 'Glass Spice Jar Set of 6', 'storage', 'saffra', 2800, 3500, 18, 4.7, 203, '{}'::text[], array['spices', 'jars', 'pantry', 'cork', 'airtight']::text[], 'Six airtight glass jars with cork lids for bulk spices and herbs.', 'Borosilicate jars with natural cork lids lined for an airtight seal. Sized for 100 g refills, with a wide mouth for measuring spoons.', array['Set of 6 jars, 180 ml each', 'Airtight lined cork lids', 'Wide mouth for spoons']::text[], '{"Material":"Borosilicate glass, natural cork","Dimensions":"Ø 5.5 × 11 cm each","Weight":"1.2 kg (set)","Care":"Jars dishwasher safe"}'::jsonb, 'assets/products/glass-spice-jar-set-t.svg', false, 74, '2026-02-10'::date),
  ('p012', 'stackable-pantry-bins', 'Stackable Airtight Pantry Bins, Set of 4', 'storage', 'saffra', 3200, null, 27, 4.5, 364, '{}'::text[], array['pantry', 'containers', 'rice', 'bulgur', 'pasta', 'airtight']::text[], 'Clear, stackable bins that keep rice, bulgur and pasta fresh through humid summers.', 'BPA-free clear bins with silicone-sealed lids that lock and stack. See at a glance how much is left, and keep pantry staples dry.', array['2 × 1.2 L, 2 × 2.4 L', 'Silicone-sealed snap lids', 'BPA-free']::text[], '{"Material":"BPA-free Tritan, silicone","Dimensions":"24 × 12 × 10 / 20 cm","Weight":"1.3 kg (set)","Care":"Top-rack dishwasher safe"}'::jsonb, 'assets/products/stackable-pantry-bins-t.svg', false, 72, '2026-06-03'::date),
  ('p013', 'stoneware-dinner-set', 'Stoneware Dinner Set, 12 pcs', 'tableware', 'porcelia', 5900, 7400, 9, 4.8, 287, '{}'::text[], array['plates', 'bowls', 'dinnerware', 'stoneware', 'set']::text[], 'Dinner plates, side plates and bowls for four, with a fine charcoal rim.', 'Speckled cream stoneware with a hand-painted charcoal rim. Chip-resistant, microwave and dishwasher safe — made for daily use, smart enough for guests.', array['4 dinner plates, 4 side plates, 4 bowls', 'Chip-resistant stoneware', 'Microwave & dishwasher safe']::text[], '{"Material":"Glazed stoneware","Sizes":"27 / 21 / 15 cm","Weight":"7.8 kg","Care":"Dishwasher safe"}'::jsonb, 'assets/products/stoneware-dinner-set-t.svg', false, 77, '2026-08-02'::date),
  ('p014', 'matte-serving-bowls', 'Matte Serving Bowls, Set of 3', 'tableware', 'porcelia', 2700, null, 20, 4.5, 96, array['new']::text[], array['bowls', 'salad', 'serving', 'ceramic']::text[], 'Three nesting bowls in charcoal, sand and white for salads and sides.', 'Large, medium and small bowls in a soft matte glaze. They nest for storage and work together on a busy table — fattoush, rice and yoghurt side by side.', array['Three nesting sizes', 'Matte glaze, glossy interior', 'Dishwasher safe']::text[], '{"Material":"Ceramic","Sizes":"Ø 26 / 20 / 15 cm","Weight":"3.2 kg","Care":"Dishwasher safe"}'::jsonb, 'assets/products/matte-serving-bowls-t.svg', false, 60, '2026-09-28'::date),
  ('p015', 'mezze-serving-set', 'Mezze Serving Set, Tray + 4 Dishes', 'tableware', 'porcelia', 3400, 4200, 12, 4.9, 412, array['bestseller']::text[], array['mezze', 'hummus', 'labneh', 'olives', 'tray', 'serving']::text[], 'An acacia tray with four porcelain dishes for hummus, labneh, olives and tabbouleh.', 'Built for the Lebanese table: four shallow porcelain dishes sit in a raised acacia tray, so a full mezze moves from kitchen to table in one trip.', array['Acacia tray + 4 porcelain dishes', 'Dishes dishwasher safe', 'Great as a gift']::text[], '{"Material":"Acacia wood, porcelain","Tray":"40 × 25 cm","Dishes":"Ø 12 cm","Care":"Wipe tray; dishes dishwasher safe"}'::jsonb, 'assets/products/mezze-serving-set-t.svg', true, 89, '2026-07-30'::date),
  ('p016', 'ceramic-mug-set', 'Ceramic Mug Set of 4', 'drinkware', 'thermique', 2200, null, 35, 4.6, 318, '{}'::text[], array['mugs', 'coffee', 'tea', 'cups', 'ceramic']::text[], 'Four 350 ml mugs in charcoal, cream and sand for coffee and tea.', 'Thick-walled ceramic that keeps drinks warm, with a comfortable full-hand handle. A neutral mix that suits any kitchen shelf.', array['4 mugs, 350 ml each', 'Thick, heat-holding walls', 'Microwave & dishwasher safe']::text[], '{"Material":"Ceramic","Capacity":"350 ml","Weight":"1.6 kg (set)","Care":"Dishwasher safe"}'::jsonb, 'assets/products/ceramic-mug-set-t.svg', false, 68, '2026-03-03'::date),
  ('p017', 'insulated-steel-bottle', 'Insulated Steel Bottle, 1 L', 'drinkware', 'thermique', 1359, 1599, 60, 4.7, 1654, array['bestseller']::text[], array['bottle', 'flask', 'thermos', 'water', 'insulated']::text[], 'Keeps water cold for 24 hours and tea hot for 12 — beach, office or school.', 'Double-wall vacuum-insulated stainless steel with a leak-proof cap and carry loop. No sweating, no metallic taste.', array['1 litre', 'Cold 24 h / hot 12 h', 'Leak-proof cap', 'BPA-free']::text[], '{"Material":"18/8 stainless steel","Capacity":"1 L","Weight":"0.45 kg","Care":"Hand wash"}'::jsonb, 'assets/products/insulated-steel-bottle-t.svg', true, 88, '2026-05-17'::date),
  ('p018', 'matte-ceramic-pour-over-set', 'Matte Ceramic Pour-Over Set', 'drinkware', 'thermique', 4600, null, 0, 4.9, 41, '{}'::text[], array['coffee', 'dripper', 'carafe', 'brew']::text[], 'Charcoal ceramic dripper and glass carafe for a slow, even cup.', 'A matte ceramic dripper that holds heat for an even extraction, paired with a 600 ml heat-resistant glass carafe. Takes standard size 02 cone filters.', array['Ceramic dripper holds heat', '600 ml glass carafe', 'Fits size 02 filters']::text[], '{"Material":"Ceramic, borosilicate glass","Capacity":"600 ml","Weight":"0.9 kg","Care":"Dishwasher safe"}'::jsonb, 'assets/products/matte-ceramic-pour-over-set-t.svg', false, 64, '2026-07-21'::date),
  ('p019', 'digital-air-fryer', 'Digital Air Fryer 4.2 L', 'appliances', 'zestro', 5999, 8599, 11, 4.7, 2366, array['bestseller']::text[], array['air fryer', 'fries', 'chicken', 'oil-free', 'appliance']::text[], 'Crispy fries and chicken with a spoon of oil, from a simple touch panel.', 'A 4.2 L basket fits a family portion, and eight presets take the guesswork out of fries, wings, fish and vegetables. Uses far less power than a full oven — handy on generator hours.', array['4.2 L non-stick basket', '8 one-touch presets', '80–200 °C, 60-minute timer', '1500 W']::text[], '{"Power":"1500 W, 220–240 V","Capacity":"4.2 L","Weight":"4.3 kg","Warranty":"1 year"}'::jsonb, 'assets/products/digital-air-fryer-t.svg', true, 95, '2026-08-19'::date),
  ('p020', 'glass-electric-kettle', 'Glass Electric Kettle, 1.7 L', 'appliances', 'zestro', 3499, null, 19, 4.5, 506, '{}'::text[], array['kettle', 'tea', 'boil', 'water', 'appliance']::text[], 'A borosilicate glass kettle that boils 1.7 L fast and glows while it heats.', 'Fast-boil 2200 W element, auto shut-off and boil-dry protection. The removable limescale filter keeps tea clear in hard-water areas.', array['1.7 L borosilicate glass', 'Auto shut-off & boil-dry protection', 'Removable limescale filter']::text[], '{"Power":"2200 W, 220–240 V","Capacity":"1.7 L","Weight":"1.2 kg","Warranty":"1 year"}'::jsonb, 'assets/products/glass-electric-kettle-t.svg', false, 69, '2026-06-28'::date),
  ('p021', 'personal-blender', 'Personal Blender with 2 Bottles', 'appliances', 'zestro', 2999, 3999, 3, 4.4, 389, array['new']::text[], array['blender', 'smoothie', 'juice', 'bottle', 'appliance']::text[], 'Blend smoothies straight into a travel bottle — one button, no jug to wash.', 'A compact 350 W motor with stainless blades and two 600 ml bottles with travel lids. Blend, twist off and go.', array['350 W motor', '2 × 600 ml bottles with lids', 'One-touch pulse']::text[], '{"Power":"350 W, 220–240 V","Capacity":"2 × 600 ml","Weight":"1.4 kg","Warranty":"1 year"}'::jsonb, 'assets/products/personal-blender-t.svg', false, 66, '2026-10-01'::date),
  ('p022', 'beechwood-dish-brush-set', 'Beechwood Dish Brush Set', 'cleaning', 'purely', 1400, null, 52, 4.6, 145, '{}'::text[], array['brush', 'dishes', 'plastic-free', 'washing up']::text[], 'A long-handled dish brush and a pot scrubber in oiled beech and plant fibre.', 'Firm plant-fibre bristles stand up to baked-on pans without scratching. The long brush has a replaceable head — order refills instead of a new brush.', array['Replaceable brush head', 'Firm plant-fibre bristles', 'Plastic-free']::text[], '{"Material":"Beechwood, tampico fibre","Size":"Brush 26 cm, scrubber Ø 8 cm","Weight":"0.2 kg","Care":"Rinse and air dry"}'::jsonb, 'assets/products/beechwood-dish-brush-set-t.svg', false, 61, '2026-01-20'::date),
  ('p023', 'microfiber-cloth-pack', 'Microfiber Cloth Pack of 12', 'cleaning', 'purely', 999, 1299, 66, 4.5, 980, '{}'::text[], array['cloths', 'dusting', 'glass', 'towels', 'kitchen']::text[], 'Twelve lint-free cloths in six colours — one per job.', 'Dense 320 gsm microfiber that lifts grease and dust with just water. Colour-code by task so the counter cloth never meets the floor.', array['12 cloths, 6 colours', '320 gsm, lint-free', 'Machine washable 500+ times']::text[], '{"Material":"80% polyester, 20% polyamide","Size":"30 × 30 cm","Weight":"0.5 kg","Care":"Machine wash 60 °C"}'::jsonb, 'assets/products/microfiber-cloth-pack-t.svg', false, 71, '2026-03-28'::date),
  ('p024', 'refillable-glass-spray-bottle', 'Refillable Glass Spray Bottle', 'cleaning', 'purely', 1200, null, 40, 4.3, 152, '{}'::text[], array['spray', 'glass', 'refill', 'cleaner', 'zero waste']::text[], 'A heavy glass bottle with a fine-mist trigger, made to be refilled for years.', 'Thick 500 ml glass with an adjustable mist-to-stream trigger. Pair it with any concentrate or a simple vinegar mix.', array['500 ml thick glass', 'Adjustable mist / stream', 'Chemical-resistant trigger']::text[], '{"Material":"Soda-lime glass, PP trigger","Capacity":"500 ml","Weight":"0.45 kg","Care":"Rinse between refills"}'::jsonb, 'assets/products/refillable-glass-spray-bottle-t.svg', false, 58, '2026-09-02'::date)
on conflict (id) do nothing;

-- ── Product images (current repo images; storefront-relative paths) ────
insert into public.product_images (product_id, url, position, alt) values
  ('p001', 'assets/products/granite-cookware-set-1.svg', 0, 'Granite Non-Stick Cookware Set, 5 pcs'),
  ('p001', 'assets/products/granite-cookware-set-2.svg', 1, 'Granite Non-Stick Cookware Set, 5 pcs — detail'),
  ('p002', 'assets/products/granite-frying-pan-1.svg', 0, 'Granite Frying Pan, 28 cm'),
  ('p002', 'assets/products/granite-frying-pan-2.svg', 1, 'Granite Frying Pan, 28 cm — detail'),
  ('p003', 'assets/products/cast-iron-casserole-1.svg', 0, 'Enamelled Cast Iron Casserole, 4.5 L'),
  ('p003', 'assets/products/cast-iron-casserole-2.svg', 1, 'Enamelled Cast Iron Casserole, 4.5 L — detail'),
  ('p004', 'assets/products/nonstick-baking-tray-set-1.svg', 0, 'Non-Stick Baking Tray Set of 2'),
  ('p004', 'assets/products/nonstick-baking-tray-set-2.svg', 1, 'Non-Stick Baking Tray Set of 2 — detail'),
  ('p005', 'assets/products/muffin-pan-12-1.svg', 0, '12-Cup Muffin Pan'),
  ('p005', 'assets/products/muffin-pan-12-2.svg', 1, '12-Cup Muffin Pan — detail'),
  ('p006', 'assets/products/springform-cake-pan-1.svg', 0, 'Springform Cake Pan, 24 cm'),
  ('p006', 'assets/products/springform-cake-pan-2.svg', 1, 'Springform Cake Pan, 24 cm — detail'),
  ('p007', 'assets/products/stainless-knife-set-1.svg', 0, 'Stainless Steel Knife Set, 6 pcs'),
  ('p007', 'assets/products/stainless-knife-set-2.svg', 1, 'Stainless Steel Knife Set, 6 pcs — detail'),
  ('p008', 'assets/products/silicone-utensil-set-1.svg', 0, 'Silicone Utensil Set with Holder, 7 pcs'),
  ('p008', 'assets/products/silicone-utensil-set-2.svg', 1, 'Silicone Utensil Set with Holder, 7 pcs — detail'),
  ('p009', 'assets/products/acacia-cutting-board-set-1.svg', 0, 'Acacia Cutting Board Set of 3'),
  ('p009', 'assets/products/acacia-cutting-board-set-2.svg', 1, 'Acacia Cutting Board Set of 3 — detail'),
  ('p010', 'assets/products/revolving-spice-rack-1.svg', 0, 'Revolving Spice Rack with 16 Jars'),
  ('p010', 'assets/products/revolving-spice-rack-2.svg', 1, 'Revolving Spice Rack with 16 Jars — detail'),
  ('p011', 'assets/products/glass-spice-jar-set-1.svg', 0, 'Glass Spice Jar Set of 6'),
  ('p011', 'assets/products/glass-spice-jar-set-2.svg', 1, 'Glass Spice Jar Set of 6 — detail'),
  ('p012', 'assets/products/stackable-pantry-bins-1.svg', 0, 'Stackable Airtight Pantry Bins, Set of 4'),
  ('p012', 'assets/products/stackable-pantry-bins-2.svg', 1, 'Stackable Airtight Pantry Bins, Set of 4 — detail'),
  ('p013', 'assets/products/stoneware-dinner-set-1.svg', 0, 'Stoneware Dinner Set, 12 pcs'),
  ('p013', 'assets/products/stoneware-dinner-set-2.svg', 1, 'Stoneware Dinner Set, 12 pcs — detail'),
  ('p014', 'assets/products/matte-serving-bowls-1.svg', 0, 'Matte Serving Bowls, Set of 3'),
  ('p014', 'assets/products/matte-serving-bowls-2.svg', 1, 'Matte Serving Bowls, Set of 3 — detail'),
  ('p015', 'assets/products/mezze-serving-set-1.svg', 0, 'Mezze Serving Set, Tray + 4 Dishes'),
  ('p015', 'assets/products/mezze-serving-set-2.svg', 1, 'Mezze Serving Set, Tray + 4 Dishes — detail'),
  ('p016', 'assets/products/ceramic-mug-set-1.svg', 0, 'Ceramic Mug Set of 4'),
  ('p016', 'assets/products/ceramic-mug-set-2.svg', 1, 'Ceramic Mug Set of 4 — detail'),
  ('p017', 'assets/products/insulated-steel-bottle-1.svg', 0, 'Insulated Steel Bottle, 1 L'),
  ('p017', 'assets/products/insulated-steel-bottle-2.svg', 1, 'Insulated Steel Bottle, 1 L — detail'),
  ('p018', 'assets/products/matte-ceramic-pour-over-set-1.svg', 0, 'Matte Ceramic Pour-Over Set'),
  ('p018', 'assets/products/matte-ceramic-pour-over-set-2.svg', 1, 'Matte Ceramic Pour-Over Set — detail'),
  ('p019', 'assets/products/digital-air-fryer-1.svg', 0, 'Digital Air Fryer 4.2 L'),
  ('p019', 'assets/products/digital-air-fryer-2.svg', 1, 'Digital Air Fryer 4.2 L — detail'),
  ('p020', 'assets/products/glass-electric-kettle-1.svg', 0, 'Glass Electric Kettle, 1.7 L'),
  ('p020', 'assets/products/glass-electric-kettle-2.svg', 1, 'Glass Electric Kettle, 1.7 L — detail'),
  ('p021', 'assets/products/personal-blender-1.svg', 0, 'Personal Blender with 2 Bottles'),
  ('p021', 'assets/products/personal-blender-2.svg', 1, 'Personal Blender with 2 Bottles — detail'),
  ('p022', 'assets/products/beechwood-dish-brush-set-1.svg', 0, 'Beechwood Dish Brush Set'),
  ('p022', 'assets/products/beechwood-dish-brush-set-2.svg', 1, 'Beechwood Dish Brush Set — detail'),
  ('p023', 'assets/products/microfiber-cloth-pack-1.svg', 0, 'Microfiber Cloth Pack of 12'),
  ('p023', 'assets/products/microfiber-cloth-pack-2.svg', 1, 'Microfiber Cloth Pack of 12 — detail'),
  ('p024', 'assets/products/refillable-glass-spray-bottle-1.svg', 0, 'Refillable Glass Spray Bottle'),
  ('p024', 'assets/products/refillable-glass-spray-bottle-2.svg', 1, 'Refillable Glass Spray Bottle — detail')
on conflict (product_id, position) do nothing;

-- ── Opening stock in the inventory log ────────────────────────
insert into public.inventory_movements (product_id, change, reason, note)
select p.id, p.stock, 'restock', 'Opening stock (seed)'
  from public.products p
 where p.stock > 0
   and not exists (select 1 from public.inventory_movements m where m.product_id = p.id);

commit;
