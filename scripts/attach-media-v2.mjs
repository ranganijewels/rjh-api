const BASE = 'http://localhost:4000/api/v1';
const TENANT = '00000000-0000-0000-0000-000000000001';
const IMG = 'http://localhost:4000/images/products';

const IMG_MAP = {
  'ring-diamond-solitaire': `${IMG}/ring-diamond-solitaire.svg`,
  'ring-eternity-band':     `${IMG}/ring-eternity-band.svg`,
  'necklace-gold-pendant':  `${IMG}/necklace-gold-pendant.svg`,
  'necklace-choker':        `${IMG}/necklace-choker-diamonds.svg`,
  'earrings-drops':         `${IMG}/earrings-diamond-drops.svg`,
  'bracelet-diamond':       `${IMG}/bracelet-gold-diamond.svg`,
  'bangle-gold':            `${IMG}/bangle-22k-gold.svg`,
};

// Map product code prefix → [primary image key, hover image key]
const PRODUCT_IMAGES = {
  'RNG-DIA-SOL':   ['ring-diamond-solitaire', 'ring-eternity-band'],
  'RNG-ETR':       ['ring-eternity-band', 'ring-diamond-solitaire'],
  'RNG-HAL':       ['ring-diamond-solitaire', 'ring-eternity-band'],
  'RNG-THREE':     ['ring-diamond-solitaire', null],
  'RNG-GOLD-22K':  ['bangle-gold', null],
  'RNG-PEAR':      ['ring-diamond-solitaire', 'ring-eternity-band'],
  'RNG-COCKTAIL':  ['ring-diamond-solitaire', 'ring-eternity-band'],
  'NCK-DIA-PEN':   ['necklace-gold-pendant', 'necklace-choker'],
  'NCK-CHK':       ['necklace-choker', 'necklace-gold-pendant'],
  'NCK-EMR':       ['necklace-gold-pendant', null],
  'NCK-LONG':      ['necklace-gold-pendant', 'necklace-choker'],
  'NCK-RUB':       ['necklace-gold-pendant', null],
  'EAR-DIA-STUD':  ['earrings-drops', null],
  'EAR-DIA-DROP':  ['earrings-drops', null],
  'EAR-JHUMKA':    ['earrings-drops', null],
  'EAR-HOOP':      ['earrings-drops', null],
  'EAR-CHAN':      ['earrings-drops', null],
  'BRC-TEN':       ['bracelet-diamond', null],
  'BRC-GOLD':      ['bracelet-diamond', 'bangle-gold'],
  'BRC-RUBY':      ['bracelet-diamond', null],
  'BNG-22K-PLAIN': ['bangle-gold', null],
  'BNG-MEENA':     ['bangle-gold', null],
  'BNG-DIA':       ['bangle-gold', null],
  'SET-BRIDAL':    ['necklace-choker', 'earrings-drops'],
  'SET-DAILY':     ['necklace-gold-pendant', 'bangle-gold'],
  'PEND-GANESH':   ['necklace-gold-pendant', null],
  'COIN-LAXMI':    ['necklace-gold-pendant', null],
};

async function login() {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-tenant-id': TENANT },
    body: JSON.stringify({ email: 'admin@rjhouse.com', password: 'Admin@123' }),
  });
  const d = await res.json();
  return d.data?.accessToken;
}

async function getProducts(token) {
  const res = await fetch(`${BASE}/products?limit=100&page=1`, {
    headers: { 'x-tenant-id': TENANT, Authorization: `Bearer ${token}` },
  });
  const d = await res.json();
  return Array.isArray(d.data) ? d.data : [];
}

async function addMedia(token, productId, fileUrl, isPrimary, order) {
  const res = await fetch(`${BASE}/products/${productId}/media`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-tenant-id': TENANT,
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ fileUrl, mediaType: 'image', sortOrder: order, isPrimary }),
  });
  const d = await res.json();
  return res.ok;
}

async function main() {
  const token = await login();
  console.log('✅ Logged in\n');

  const products = await getProducts(token);
  console.log(`Found ${products.length} products\n`);

  let attached = 0;
  for (const p of products) {
    // Skip if already has media
    if (p.media && p.media.length > 0) {
      console.log(`  ⏭  Skip (has media): ${p.productName}`);
      continue;
    }

    // Find image mapping
    const code = p.productCode || '';
    let imgKeys = null;
    for (const [prefix, keys] of Object.entries(PRODUCT_IMAGES)) {
      if (code.startsWith(prefix)) { imgKeys = keys; break; }
    }

    if (!imgKeys) {
      // Fallback based on category
      const cat = p.category || '';
      if (cat.includes('Ring')) imgKeys = ['ring-diamond-solitaire', 'ring-eternity-band'];
      else if (cat.includes('Necklace')) imgKeys = ['necklace-gold-pendant', 'necklace-choker'];
      else if (cat.includes('Earring')) imgKeys = ['earrings-drops', null];
      else if (cat.includes('Bracelet')) imgKeys = ['bracelet-diamond', null];
      else if (cat.includes('Bangle')) imgKeys = ['bangle-gold', null];
      else imgKeys = ['necklace-gold-pendant', null];
    }

    const primaryUrl = IMG_MAP[imgKeys[0]];
    const hoverUrl = imgKeys[1] ? IMG_MAP[imgKeys[1]] : null;

    let ok = await addMedia(token, p.id, primaryUrl, true, 0);
    if (hoverUrl) await addMedia(token, p.id, hoverUrl, false, 1);

    if (ok) {
      console.log(`  ✅ ${p.productName}`);
      attached++;
    } else {
      console.log(`  ❌ Failed: ${p.productName}`);
    }
    await new Promise(r => setTimeout(r, 60));
  }

  console.log(`\n✅ Attached media to ${attached} products`);
}

main().catch(console.error);
