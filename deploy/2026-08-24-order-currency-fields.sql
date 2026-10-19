ALTER TABLE jeos_orders ADD COLUMN IF NOT EXISTS currency_code varchar NOT NULL DEFAULT 'USD';
ALTER TABLE jeos_orders ADD COLUMN IF NOT EXISTS charged_amount numeric(14,2);
