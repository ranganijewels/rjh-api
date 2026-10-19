-- Campaign attribution + consented Meta match keys (idempotent).
ALTER TABLE jeos_orders              ADD COLUMN IF NOT EXISTS marketing jsonb;
ALTER TABLE contact_submissions      ADD COLUMN IF NOT EXISTS marketing jsonb;
ALTER TABLE appointments             ADD COLUMN IF NOT EXISTS marketing jsonb;
ALTER TABLE resize_repair_requests   ADD COLUMN IF NOT EXISTS marketing jsonb;
ALTER TABLE custom_requests          ADD COLUMN IF NOT EXISTS marketing jsonb;
