/**
 * Attach proper media records to all products that have mainImageUrl set
 * Fixes the `fileUrl` field that the seeding script sent wrong
 */

const BASE = 'http://localhost:4000/api/v1';
const TENANT = '00000000-0000-0000-0000-000000000001';

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
  return d.data || [];
}

async function addMediaRecord(token, productId, fileUrl, isPrimary = false) {
  const res = await fetch(`${BASE}/products/${productId}/media`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-tenant-id': TENANT,
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      fileUrl,
      mediaType: 'image',
      sortOrder: isPrimary ? 0 : 1,
      isPrimary,
    }),
  });
  return res.ok;
}

async function main() {
  const token = await login();
  console.log('✅ Logged in\n');

  const products = await getProducts(token);
  console.log(`Found ${products.length} products\n`);

  let attached = 0;
  for (const p of products) {
    if (p.mainImageUrl && p.media?.length === 0) {
      const ok = await addMediaRecord(token, p.id, p.mainImageUrl, true);
      if (ok) {
        console.log(`  ✅ Attached media to: ${p.productName}`);
        attached++;
      } else {
        console.log(`  ❌ Failed for: ${p.productName}`);
      }
      await new Promise(r => setTimeout(r, 80));
    } else if (p.media?.length > 0) {
      console.log(`  ⏭  Already has ${p.media.length} media: ${p.productName}`);
    } else {
      console.log(`  ⚠️  No mainImageUrl: ${p.productName}`);
    }
  }

  console.log(`\n✅ Attached media to ${attached} products`);
}

main().catch(console.error);
