ALTER TABLE jeos_orders ADD COLUMN IF NOT EXISTS payment_method varchar NOT NULL DEFAULT 'COD';
ALTER TABLE jeos_orders ADD COLUMN IF NOT EXISTS payment_gateway varchar;
ALTER TABLE jeos_orders ADD COLUMN IF NOT EXISTS cf_payment_session_id text;
ALTER TABLE jeos_orders ADD COLUMN IF NOT EXISTS cf_payment_id varchar;
