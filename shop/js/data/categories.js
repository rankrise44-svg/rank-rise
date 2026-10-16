/* Catalog categories. `id` is used in URLs (shop.html?category=cookware)
   and on every product's `category` field. `icon` is a cut-out image
   shown in the round category tiles. */

const cut = (slug) => `assets/products/${slug}-t.svg`;

export const CATEGORIES = [
  { id: 'cookware',      name: 'Cookware',               blurb: 'Granite pans, pots and cast iron for everyday cooking.', icon: cut('granite-cookware-set') },
  { id: 'bakeware',      name: 'Bakeware',               blurb: 'Trays, tins and pans for bread, cakes and kaak.',       icon: cut('nonstick-baking-tray-set') },
  { id: 'kitchen-tools', name: 'Kitchen Tools',          blurb: 'Knives, boards and utensils that do the hard work.',    icon: cut('silicone-utensil-set') },
  { id: 'storage',       name: 'Storage & Organization', blurb: 'Jars, racks and bins for a calm, tidy pantry.',         icon: cut('glass-spice-jar-set') },
  { id: 'tableware',     name: 'Tableware',              blurb: 'Plates, bowls and mezze sets for the family table.',     icon: cut('stoneware-dinner-set') },
  { id: 'drinkware',     name: 'Drinkware',              blurb: 'Mugs, bottles and coffee gear for every cup.',           icon: cut('ceramic-mug-set') },
  { id: 'appliances',    name: 'Appliances',             blurb: 'Air fryers, kettles and blenders that save time.',       icon: cut('personal-blender') },
  { id: 'cleaning',      name: 'Cleaning Essentials',    blurb: 'Brushes, cloths and refillable bottles.',                icon: cut('refillable-glass-spray-bottle') },
];
