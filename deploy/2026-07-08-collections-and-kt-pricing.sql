-- Deploy SQL for the admin-panel batch (collections + derived KT pricing).
-- Live DB runs with synchronize:false, so new tables ship as explicit DDL.
-- Run as postgres:  sudo -u postgres psql -d rjhouse_db -f <this file>

-- 1) Collections table (matches src/database/entities/collection.entity.ts)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE TABLE IF NOT EXISTS jeos_collections (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id varchar NOT NULL,
  name varchar NOT NULL,
  slug varchar NOT NULL,
  description text,
  hero_image varchar,
  sort_order int NOT NULL DEFAULT 0,
  product_ids jsonb NOT NULL DEFAULT '[]',
  status varchar NOT NULL DEFAULT 'active',
  created_by varchar,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "IDX_jeos_collections_tenant_slug"
  ON jeos_collections (tenant_id, slug);
CREATE INDEX IF NOT EXISTS "IDX_jeos_collections_tenant_status"
  ON jeos_collections (tenant_id, status);

-- 2) Seed collection rows from the collection names already on products
--    (Aurora / Bridal / Engagement / …) so they appear in the manager instantly.
INSERT INTO jeos_collections (tenant_id, name, slug, status)
SELECT DISTINCT
  tenant_id,
  trim(collection_name),
  lower(regexp_replace(trim(collection_name), '[^a-zA-Z0-9]+', '-', 'g')),
  'active'
FROM jeos_products
WHERE collection_name IS NOT NULL AND trim(collection_name) <> ''
ON CONFLICT (tenant_id, slug) DO NOTHING;

-- 3) Derived KT pricing cleanup: archive the manually-derived gold rate rows so
--    the engine's automatic derivation (24K × factor ÷ 99.9) takes over.
--    The 24K gold row and all Silver/Platinum rows stay untouched.
--    Derived prices from 24K=153.60: 18K→119.94, 14K→92.25 (matches the manual
--    rows they replace), 10K→66.12.
UPDATE jeos_metal_rates
SET status = 'archived'
WHERE lower(metal_type) = 'gold'
  AND upper(replace(purity, 'KT', 'K')) <> '24K'
  AND status = 'active';
