/**
 * Seed script: creates 30 realistic jewelry products in the NestJS API
 * Run: node scripts/seed-products.mjs
 */

const BASE = 'http://localhost:4000/api/v1';
const TENANT = '00000000-0000-0000-0000-000000000001';
const IMG_BASE = 'http://localhost:4000/images/products';

async function login() {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-tenant-id': TENANT },
    body: JSON.stringify({ email: 'admin@rjhouse.com', password: 'Admin@123' }),
  });
  const d = await res.json();
  return d.data?.accessToken;
}

async function createProduct(token, product) {
  const res = await fetch(`${BASE}/products`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-tenant-id': TENANT,
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(product),
  });
  const d = await res.json();
  if (!d.data?.id) {
    console.error('  FAILED:', d.message || JSON.stringify(d).slice(0, 120));
    return null;
  }
  return d.data;
}

async function addMedia(token, productId, imageUrl, altText) {
  // Add media record directly by updating product with mainImageUrl
  const res = await fetch(`${BASE}/products/${productId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'x-tenant-id': TENANT,
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ mainImageUrl: imageUrl }),
  });
  return res.ok;
}

async function addMediaRecord(token, productId, imageUrl, altText, order = 0) {
  // Try to add via product media endpoint
  const res = await fetch(`${BASE}/products/${productId}/media`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-tenant-id': TENANT,
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ url: imageUrl, altText, sortOrder: order, mediaType: 'image' }),
  });
  return res.ok;
}

const PRODUCTS = [
  // ──────────── RINGS ────────────
  {
    product: {
      productCode: 'RNG-DIA-SOL-001',
      productName: 'Classic Diamond Solitaire Ring',
      description: 'A timeless 18K yellow gold solitaire ring featuring a 0.50ct round brilliant diamond with VS1 clarity and F color. Set in a four-prong cathedral setting that elevates the diamond beautifully.',
      category: 'Rings',
      subCategory: 'Solitaire Rings',
      metalType: 'Gold',
      metalPurity: '18K',
      metalColor: 'Yellow Gold',
      diamondShape: 'Round',
      diamondQuality: 'VS1-F',
      grossWeightG: 3.8,
      netWeightG: 3.2,
      diamondWeightCt: 0.50,
      makingCharge: 2500,
      mrp: 85000,
      status: 'active',
    },
    images: [
      { url: `${IMG_BASE}/ring-diamond-solitaire.svg`, alt: 'Diamond Solitaire Ring Front' },
      { url: `${IMG_BASE}/ring-eternity-band.svg`, alt: 'Diamond Solitaire Ring Side' },
    ],
  },
  {
    product: {
      productCode: 'RNG-ETR-DIA-001',
      productName: 'Diamond Eternity Band',
      description: 'An exquisite 18K white gold eternity band with 15 round brilliant diamonds totaling 1.20ct. Each diamond is channel-set for a seamless, modern look. Perfect as a wedding band or anniversary gift.',
      category: 'Rings',
      subCategory: 'Eternity Bands',
      metalType: 'Gold',
      metalPurity: '18K',
      metalColor: 'White Gold',
      diamondShape: 'Round',
      diamondQuality: 'VS2-G',
      grossWeightG: 4.5,
      netWeightG: 3.9,
      diamondWeightCt: 1.20,
      makingCharge: 3200,
      mrp: 145000,
      status: 'active',
    },
    images: [
      { url: `${IMG_BASE}/ring-eternity-band.svg`, alt: 'Diamond Eternity Band' },
      { url: `${IMG_BASE}/ring-diamond-solitaire.svg`, alt: 'Diamond Eternity Band Profile' },
    ],
  },
  {
    product: {
      productCode: 'RNG-HAL-OVAL-001',
      productName: 'Oval Halo Diamond Ring',
      description: 'A breathtaking 14K rose gold halo engagement ring featuring a 0.75ct oval center diamond surrounded by a halo of 22 round brilliant diamonds. Delicate milgrain detailing on the band adds vintage charm.',
      category: 'Rings',
      subCategory: 'Halo Rings',
      metalType: 'Gold',
      metalPurity: '14K',
      metalColor: 'Rose Gold',
      diamondShape: 'Oval',
      diamondQuality: 'SI1-H',
      grossWeightG: 4.2,
      netWeightG: 3.6,
      diamondWeightCt: 0.98,
      makingCharge: 2800,
      mrp: 115000,
      status: 'active',
    },
    images: [
      { url: `${IMG_BASE}/ring-diamond-solitaire.svg`, alt: 'Oval Halo Ring' },
      { url: `${IMG_BASE}/ring-eternity-band.svg`, alt: 'Oval Halo Ring Side View' },
    ],
  },
  {
    product: {
      productCode: 'RNG-THREE-STONE-001',
      productName: 'Three Stone Diamond Ring',
      description: 'A classic three-stone ring in 18K yellow gold representing past, present, and future. Features a 0.50ct princess-cut center diamond flanked by two 0.25ct round brilliant diamonds. Symbolizes the journey of love.',
      category: 'Rings',
      subCategory: 'Three Stone Rings',
      metalType: 'Gold',
      metalPurity: '18K',
      metalColor: 'Yellow Gold',
      diamondShape: 'Princess',
      diamondQuality: 'VS1-E',
      grossWeightG: 5.1,
      netWeightG: 4.4,
      diamondWeightCt: 1.00,
      makingCharge: 3500,
      mrp: 175000,
      status: 'active',
    },
    images: [
      { url: `${IMG_BASE}/ring-diamond-solitaire.svg`, alt: 'Three Stone Ring' },
    ],
  },
  {
    product: {
      productCode: 'RNG-GOLD-22K-001',
      productName: '22K Gold Wedding Band',
      description: 'A traditional 22K gold wedding band with a smooth polished finish and subtle carved border design. Comfortable court profile makes it ideal for everyday wear. Available in widths of 4mm and 6mm.',
      category: 'Rings',
      subCategory: 'Wedding Bands',
      metalType: 'Gold',
      metalPurity: '22K',
      metalColor: 'Yellow Gold',
      grossWeightG: 6.2,
      netWeightG: 6.2,
      makingCharge: 1800,
      mrp: 42000,
      status: 'active',
    },
    images: [
      { url: `${IMG_BASE}/bangle-22k-gold.svg`, alt: '22K Gold Wedding Band' },
    ],
  },
  {
    product: {
      productCode: 'RNG-PEAR-SOL-001',
      productName: 'Pear Shape Solitaire Ring',
      description: 'A show-stopping 18K white gold solitaire featuring a 0.85ct pear-shaped diamond with exceptional brilliance. The elongated silhouette creates an elegant, slimming effect on the finger.',
      category: 'Rings',
      subCategory: 'Solitaire Rings',
      metalType: 'Gold',
      metalPurity: '18K',
      metalColor: 'White Gold',
      diamondShape: 'Pear',
      diamondQuality: 'VVS2-F',
      grossWeightG: 3.5,
      netWeightG: 2.9,
      diamondWeightCt: 0.85,
      makingCharge: 2900,
      mrp: 162000,
      status: 'active',
    },
    images: [
      { url: `${IMG_BASE}/ring-diamond-solitaire.svg`, alt: 'Pear Shape Solitaire' },
      { url: `${IMG_BASE}/ring-eternity-band.svg`, alt: 'Pear Shape Ring Side' },
    ],
  },

  // ──────────── NECKLACES ────────────
  {
    product: {
      productCode: 'NCK-DIA-PEN-001',
      productName: 'Diamond Solitaire Pendant Necklace',
      description: 'A refined 18K yellow gold pendant necklace with a 0.30ct round brilliant diamond in a classic prong setting. Comes with an 18-inch delicate box chain. Versatile enough for everyday elegance or special occasions.',
      category: 'Necklaces',
      subCategory: 'Pendants',
      metalType: 'Gold',
      metalPurity: '18K',
      metalColor: 'Yellow Gold',
      diamondShape: 'Round',
      diamondQuality: 'VS1-G',
      grossWeightG: 4.8,
      netWeightG: 4.2,
      diamondWeightCt: 0.30,
      makingCharge: 2200,
      mrp: 65000,
      status: 'active',
    },
    images: [
      { url: `${IMG_BASE}/necklace-gold-pendant.svg`, alt: 'Diamond Pendant Necklace' },
      { url: `${IMG_BASE}/necklace-choker-diamonds.svg`, alt: 'Diamond Pendant Side View' },
    ],
  },
  {
    product: {
      productCode: 'NCK-CHK-DIA-001',
      productName: 'Diamond Choker Necklace',
      description: 'A glamorous 18K white gold diamond choker featuring 45 round brilliant diamonds totaling 2.50ct. Five-row tennis-style setting creates a dazzling ribbon of light. The statement piece for unforgettable evenings.',
      category: 'Necklaces',
      subCategory: 'Chokers',
      metalType: 'Gold',
      metalPurity: '18K',
      metalColor: 'White Gold',
      diamondShape: 'Round',
      diamondQuality: 'VS2-H',
      grossWeightG: 22.5,
      netWeightG: 18.8,
      diamondWeightCt: 2.50,
      makingCharge: 12000,
      mrp: 485000,
      status: 'active',
    },
    images: [
      { url: `${IMG_BASE}/necklace-choker-diamonds.svg`, alt: 'Diamond Choker Necklace' },
      { url: `${IMG_BASE}/necklace-gold-pendant.svg`, alt: 'Diamond Choker Side' },
    ],
  },
  {
    product: {
      productCode: 'NCK-EMR-PEN-001',
      productName: 'Emerald Gold Pendant',
      description: 'An heirloom-quality 22K gold floral pendant set with a natural Colombian emerald (1.20ct) at its center, surrounded by intricate gold petals. Traditional craftsmanship meets precious gemstone beauty.',
      category: 'Necklaces',
      subCategory: 'Pendants',
      metalType: 'Gold',
      metalPurity: '22K',
      metalColor: 'Yellow Gold',
      grossWeightG: 8.5,
      netWeightG: 7.8,
      makingCharge: 4500,
      mrp: 95000,
      status: 'active',
    },
    images: [
      { url: `${IMG_BASE}/necklace-gold-pendant.svg`, alt: 'Emerald Gold Pendant' },
    ],
  },
  {
    product: {
      productCode: 'NCK-LONG-CHAIN-001',
      productName: '22K Gold Long Chain Necklace',
      description: 'A stunning 30-inch 22K gold long chain with an intricate rope design. The generous length allows multiple styling options — wear solo, doubled, or layered with shorter necklaces for a contemporary look.',
      category: 'Necklaces',
      subCategory: 'Chains',
      metalType: 'Gold',
      metalPurity: '22K',
      metalColor: 'Yellow Gold',
      grossWeightG: 18.2,
      netWeightG: 18.2,
      makingCharge: 5200,
      mrp: 125000,
      status: 'active',
    },
    images: [
      { url: `${IMG_BASE}/necklace-gold-pendant.svg`, alt: '22K Gold Chain' },
      { url: `${IMG_BASE}/necklace-choker-diamonds.svg`, alt: 'Gold Chain Detail' },
    ],
  },
  {
    product: {
      productCode: 'NCK-RUB-PEN-001',
      productName: 'Ruby Heart Pendant',
      description: 'A romantic 18K rose gold heart-shaped pendant featuring a vivid natural ruby (0.80ct) at its center, framed by a delicate border of round brilliant diamonds. The perfect gift for those who wear their heart on their sleeve.',
      category: 'Necklaces',
      subCategory: 'Pendants',
      metalType: 'Gold',
      metalPurity: '18K',
      metalColor: 'Rose Gold',
      diamondShape: 'Round',
      diamondQuality: 'VS1-F',
      grossWeightG: 5.2,
      netWeightG: 4.5,
      diamondWeightCt: 0.25,
      makingCharge: 2800,
      mrp: 78000,
      status: 'active',
    },
    images: [
      { url: `${IMG_BASE}/necklace-gold-pendant.svg`, alt: 'Ruby Heart Pendant' },
    ],
  },

  // ──────────── EARRINGS ────────────
  {
    product: {
      productCode: 'EAR-DIA-STUD-001',
      productName: 'Classic Diamond Stud Earrings',
      description: 'Timeless 18K white gold diamond stud earrings featuring two round brilliant diamonds totaling 0.50ct (0.25ct each). Four-prong martini setting maximizes brilliance. Push-back closure for secure wear.',
      category: 'Earrings',
      subCategory: 'Studs',
      metalType: 'Gold',
      metalPurity: '18K',
      metalColor: 'White Gold',
      diamondShape: 'Round',
      diamondQuality: 'VS1-G',
      grossWeightG: 1.8,
      netWeightG: 1.4,
      diamondWeightCt: 0.50,
      makingCharge: 1800,
      mrp: 58000,
      status: 'active',
    },
    images: [
      { url: `${IMG_BASE}/earrings-diamond-drops.svg`, alt: 'Diamond Stud Earrings' },
    ],
  },
  {
    product: {
      productCode: 'EAR-DIA-DROP-001',
      productName: 'Diamond Drop Earrings',
      description: 'Elegant 18K yellow gold drop earrings featuring a pear-shaped diamond drop (0.40ct each) suspended from a delicate gold bar accented with ruby cabochons. Movement creates mesmerizing sparkle at every turn.',
      category: 'Earrings',
      subCategory: 'Drop Earrings',
      metalType: 'Gold',
      metalPurity: '18K',
      metalColor: 'Yellow Gold',
      diamondShape: 'Pear',
      diamondQuality: 'VS2-H',
      grossWeightG: 4.2,
      netWeightG: 3.5,
      diamondWeightCt: 0.80,
      makingCharge: 2400,
      mrp: 112000,
      status: 'active',
    },
    images: [
      { url: `${IMG_BASE}/earrings-diamond-drops.svg`, alt: 'Diamond Drop Earrings' },
    ],
  },
  {
    product: {
      productCode: 'EAR-JHUMKA-22K-001',
      productName: '22K Gold Jhumka Earrings',
      description: 'Traditional 22K gold jhumka earrings crafted with intricate filigree work and featuring a cascading bell design with ruby and emerald embellishments. A celebration of Indian heritage and craftsmanship.',
      category: 'Earrings',
      subCategory: 'Jhumkas',
      metalType: 'Gold',
      metalPurity: '22K',
      metalColor: 'Yellow Gold',
      grossWeightG: 12.5,
      netWeightG: 10.8,
      makingCharge: 4200,
      mrp: 88000,
      status: 'active',
    },
    images: [
      { url: `${IMG_BASE}/earrings-diamond-drops.svg`, alt: '22K Gold Jhumka Earrings' },
    ],
  },
  {
    product: {
      productCode: 'EAR-HOOP-GOLD-001',
      productName: '18K Gold Diamond Hoop Earrings',
      description: 'Modern 18K yellow gold huggie hoop earrings with a row of channel-set round brilliant diamonds on the outer half (0.35ct total). Hinged closure for easy wear. Diameter: 20mm.',
      category: 'Earrings',
      subCategory: 'Hoops',
      metalType: 'Gold',
      metalPurity: '18K',
      metalColor: 'Yellow Gold',
      diamondShape: 'Round',
      diamondQuality: 'SI1-G',
      grossWeightG: 5.8,
      netWeightG: 4.9,
      diamondWeightCt: 0.35,
      makingCharge: 2000,
      mrp: 72000,
      status: 'active',
    },
    images: [
      { url: `${IMG_BASE}/earrings-diamond-drops.svg`, alt: 'Diamond Hoop Earrings' },
    ],
  },
  {
    product: {
      productCode: 'EAR-CHAN-001',
      productName: 'Chandelier Diamond Earrings',
      description: 'Spectacular 18K white gold chandelier earrings featuring three tiers of round and marquise diamonds totaling 1.80ct. Designed for grand occasions — galas, weddings, and milestone celebrations.',
      category: 'Earrings',
      subCategory: 'Chandeliers',
      metalType: 'Gold',
      metalPurity: '18K',
      metalColor: 'White Gold',
      diamondShape: 'Round',
      diamondQuality: 'VS1-F',
      grossWeightG: 8.4,
      netWeightG: 6.8,
      diamondWeightCt: 1.80,
      makingCharge: 6500,
      mrp: 325000,
      status: 'active',
    },
    images: [
      { url: `${IMG_BASE}/earrings-diamond-drops.svg`, alt: 'Chandelier Diamond Earrings' },
    ],
  },

  // ──────────── BRACELETS ────────────
  {
    product: {
      productCode: 'BRC-TEN-DIA-001',
      productName: 'Diamond Tennis Bracelet',
      description: 'A classic 18K white gold tennis bracelet featuring 50 round brilliant diamonds totaling 5.00ct. Four-prong individual settings allow each diamond to radiate maximum brilliance. Box clasp with safety latch.',
      category: 'Bracelets',
      subCategory: 'Tennis Bracelets',
      metalType: 'Gold',
      metalPurity: '18K',
      metalColor: 'White Gold',
      diamondShape: 'Round',
      diamondQuality: 'VS2-G',
      grossWeightG: 15.2,
      netWeightG: 12.8,
      diamondWeightCt: 5.00,
      makingCharge: 18000,
      mrp: 890000,
      status: 'active',
    },
    images: [
      { url: `${IMG_BASE}/bracelet-gold-diamond.svg`, alt: 'Diamond Tennis Bracelet' },
    ],
  },
  {
    product: {
      productCode: 'BRC-GOLD-22K-001',
      productName: '22K Gold Charm Bracelet',
      description: 'A versatile 22K gold curb-link bracelet with a lobster clasp, designed to hold charms. Comes with three gold charms: a heart, a star, and a key. Additional charms available separately.',
      category: 'Bracelets',
      subCategory: 'Charm Bracelets',
      metalType: 'Gold',
      metalPurity: '22K',
      metalColor: 'Yellow Gold',
      grossWeightG: 9.8,
      netWeightG: 9.8,
      makingCharge: 3200,
      mrp: 68000,
      status: 'active',
    },
    images: [
      { url: `${IMG_BASE}/bracelet-gold-diamond.svg`, alt: '22K Gold Charm Bracelet' },
      { url: `${IMG_BASE}/bangle-22k-gold.svg`, alt: 'Gold Charm Bracelet Charms' },
    ],
  },
  {
    product: {
      productCode: 'BRC-RUBY-GOLD-001',
      productName: 'Ruby & Diamond Gold Bracelet',
      description: 'A vibrant 18K yellow gold bracelet alternating between oval rubies (total 3.50ct) and brilliant-cut diamonds (total 1.20ct). Milgrain-edged box links add vintage character to this bold statement piece.',
      category: 'Bracelets',
      subCategory: 'Gemstone Bracelets',
      metalType: 'Gold',
      metalPurity: '18K',
      metalColor: 'Yellow Gold',
      diamondShape: 'Round',
      diamondQuality: 'VS1-G',
      grossWeightG: 18.6,
      netWeightG: 15.2,
      diamondWeightCt: 1.20,
      makingCharge: 8500,
      mrp: 285000,
      status: 'active',
    },
    images: [
      { url: `${IMG_BASE}/bracelet-gold-diamond.svg`, alt: 'Ruby Diamond Bracelet' },
    ],
  },

  // ──────────── BANGLES ────────────
  {
    product: {
      productCode: 'BNG-22K-PLAIN-001',
      productName: '22K Plain Gold Bangle Set',
      description: 'Set of 4 traditional 22K gold plain bangles with a smooth polished finish. Each bangle weighs approximately 8g. Available in sizes 2/4, 2/6, 2/8, and 2/10. Stackable design for layered styling.',
      category: 'Bangles',
      subCategory: 'Plain Bangles',
      metalType: 'Gold',
      metalPurity: '22K',
      metalColor: 'Yellow Gold',
      grossWeightG: 32.0,
      netWeightG: 32.0,
      makingCharge: 6800,
      mrp: 218000,
      status: 'active',
    },
    images: [
      { url: `${IMG_BASE}/bangle-22k-gold.svg`, alt: '22K Gold Plain Bangles' },
    ],
  },
  {
    product: {
      productCode: 'BNG-MEENAKARI-001',
      productName: 'Meenakari Gold Bangle',
      description: 'A pair of exquisite 22K gold bangles adorned with traditional meenakari enamel work in vibrant red, green, and blue. Intricate floral motifs handcrafted by master artisans in Jaipur. A wearable work of art.',
      category: 'Bangles',
      subCategory: 'Meenakari Bangles',
      metalType: 'Gold',
      metalPurity: '22K',
      metalColor: 'Yellow Gold',
      grossWeightG: 24.5,
      netWeightG: 22.0,
      makingCharge: 9500,
      mrp: 165000,
      status: 'active',
    },
    images: [
      { url: `${IMG_BASE}/bangle-22k-gold.svg`, alt: 'Meenakari Gold Bangle' },
    ],
  },
  {
    product: {
      productCode: 'BNG-DIA-22K-001',
      productName: '22K Diamond-studded Bangle',
      description: 'A bold 22K gold bangle with an outer surface studded with 36 round brilliant diamonds totaling 1.80ct. The combination of high-purity gold and sparkling diamonds creates a luxurious, festive look.',
      category: 'Bangles',
      subCategory: 'Diamond Bangles',
      metalType: 'Gold',
      metalPurity: '22K',
      metalColor: 'Yellow Gold',
      diamondShape: 'Round',
      diamondQuality: 'SI1-G',
      grossWeightG: 18.5,
      netWeightG: 15.2,
      diamondWeightCt: 1.80,
      makingCharge: 7200,
      mrp: 248000,
      status: 'active',
    },
    images: [
      { url: `${IMG_BASE}/bangle-22k-gold.svg`, alt: 'Diamond Studded Bangle' },
    ],
  },

  // ──────────── SETS ────────────
  {
    product: {
      productCode: 'SET-BRIDAL-001',
      productName: 'Bridal Diamond Jewellery Set',
      description: 'A complete bridal set in 18K yellow gold comprising a necklace, earrings, and maang tikka. Features 185 round brilliant diamonds totaling 4.50ct with intricate filigree work. Presented in a luxury box.',
      category: 'Sets',
      subCategory: 'Bridal Sets',
      metalType: 'Gold',
      metalPurity: '18K',
      metalColor: 'Yellow Gold',
      diamondShape: 'Round',
      diamondQuality: 'VS2-G',
      grossWeightG: 58.0,
      netWeightG: 48.5,
      diamondWeightCt: 4.50,
      makingCharge: 32000,
      mrp: 875000,
      status: 'active',
    },
    images: [
      { url: `${IMG_BASE}/necklace-choker-diamonds.svg`, alt: 'Bridal Diamond Set Necklace' },
      { url: `${IMG_BASE}/earrings-diamond-drops.svg`, alt: 'Bridal Diamond Set Earrings' },
    ],
  },
  {
    product: {
      productCode: 'SET-DAILY-GOLD-001',
      productName: 'Daily Wear Gold Set',
      description: 'A lightweight 22K gold jewellery set perfect for everyday wear. Includes a delicate necklace, small drop earrings, and a slim bangle. The set exudes understated elegance without being overpowering.',
      category: 'Sets',
      subCategory: 'Daily Wear Sets',
      metalType: 'Gold',
      metalPurity: '22K',
      metalColor: 'Yellow Gold',
      grossWeightG: 20.5,
      netWeightG: 20.5,
      makingCharge: 5800,
      mrp: 142000,
      status: 'active',
    },
    images: [
      { url: `${IMG_BASE}/necklace-gold-pendant.svg`, alt: 'Daily Wear Gold Set' },
      { url: `${IMG_BASE}/bangle-22k-gold.svg`, alt: 'Daily Wear Set Bangle' },
    ],
  },

  // ──────────── SPECIAL ────────────
  {
    product: {
      productCode: 'PEND-GANESH-22K-001',
      productName: 'Lord Ganesha Gold Pendant',
      description: 'A beautifully crafted 22K gold pendant depicting Lord Ganesha with intricate detailing. Studded with rubies for the eyes and garnet for the accessories. A sacred piece that carries both spiritual and aesthetic beauty.',
      category: 'Religious',
      subCategory: 'God Pendants',
      metalType: 'Gold',
      metalPurity: '22K',
      metalColor: 'Yellow Gold',
      grossWeightG: 6.8,
      netWeightG: 6.2,
      makingCharge: 3800,
      mrp: 48500,
      status: 'active',
    },
    images: [
      { url: `${IMG_BASE}/necklace-gold-pendant.svg`, alt: 'Ganesha Gold Pendant' },
    ],
  },
  {
    product: {
      productCode: 'COIN-LAXMI-22K-001',
      productName: 'Goddess Lakshmi Gold Coin Pendant',
      description: 'An 8g 22K gold coin pendant bearing the image of Goddess Lakshmi, surrounded by a floral gold frame. An auspicious piece traditionally given as a gift during Diwali, Dhanteras, and weddings.',
      category: 'Religious',
      subCategory: 'Coin Pendants',
      metalType: 'Gold',
      metalPurity: '22K',
      metalColor: 'Yellow Gold',
      grossWeightG: 9.5,
      netWeightG: 9.0,
      makingCharge: 2500,
      mrp: 62000,
      status: 'active',
    },
    images: [
      { url: `${IMG_BASE}/necklace-gold-pendant.svg`, alt: 'Lakshmi Gold Coin Pendant' },
    ],
  },
  {
    product: {
      productCode: 'RNG-COCKTAIL-001',
      productName: 'Emerald Cocktail Ring',
      description: 'A bold cocktail ring in 18K yellow gold featuring a large oval Colombian emerald (2.50ct) at its center, surrounded by two rows of round brilliant diamonds (0.90ct total). Designed to command attention.',
      category: 'Rings',
      subCategory: 'Cocktail Rings',
      metalType: 'Gold',
      metalPurity: '18K',
      metalColor: 'Yellow Gold',
      diamondShape: 'Round',
      diamondQuality: 'VS1-F',
      grossWeightG: 8.5,
      netWeightG: 7.2,
      diamondWeightCt: 0.90,
      makingCharge: 5500,
      mrp: 285000,
      status: 'active',
    },
    images: [
      { url: `${IMG_BASE}/ring-diamond-solitaire.svg`, alt: 'Emerald Cocktail Ring' },
      { url: `${IMG_BASE}/ring-eternity-band.svg`, alt: 'Cocktail Ring Side View' },
    ],
  },
];

async function main() {
  console.log('🚀 Starting product seeding...\n');

  const token = await login();
  if (!token) {
    console.error('❌ Login failed — check API is running and credentials are correct');
    process.exit(1);
  }
  console.log('✅ Authenticated\n');

  let created = 0;
  let failed = 0;

  for (const { product, images } of PRODUCTS) {
    process.stdout.write(`  Creating: ${product.productName}... `);
    const result = await createProduct(token, product);
    if (!result) {
      failed++;
      continue;
    }

    // Add media records
    for (let i = 0; i < images.length; i++) {
      await addMediaRecord(token, result.id, images[i].url, images[i].alt, i);
    }

    // Also set the main image URL directly
    await addMedia(token, result.id, images[0].url, images[0].alt);

    console.log(`✅ ID: ${result.id.slice(0, 8)}`);
    created++;

    // Small delay to avoid overwhelming the API
    await new Promise(r => setTimeout(r, 100));
  }

  console.log(`\n✅ Done! Created ${created} products, ${failed} failed.`);
  console.log(`📦 Total products in catalog: ${created + 4} (including 4 pre-existing)`);
}

main().catch(console.error);
