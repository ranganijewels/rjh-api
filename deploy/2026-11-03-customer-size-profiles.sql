-- Saved size profiles for storefront accounts (idempotent).
CREATE TABLE IF NOT EXISTS customer_size_profiles (
  id                 uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id            uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id          uuid,
  name               varchar(100) NOT NULL,
  ring_size          varchar(20),
  wedding_band_size  varchar(20),
  bracelet_size      varchar(20),
  necklace_length    varchar(20),
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_customer_size_profiles_user_id ON customer_size_profiles (user_id);
