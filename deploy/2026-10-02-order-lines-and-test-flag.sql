-- Full configured cart lines on storefront orders + test-order flag (RJHADU RJH-02 / RJH-18).
ALTER TABLE jeos_orders ADD COLUMN IF NOT EXISTS line_items jsonb;
ALTER TABLE jeos_orders ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_jeos_orders_tenant_is_test ON jeos_orders (tenant_id, is_test);
