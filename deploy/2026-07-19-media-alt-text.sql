-- Deploy SQL for per-image SEO alt text.
-- Live DB runs with synchronize:false, so new columns ship as explicit DDL.
-- Run as postgres:  sudo -u postgres psql -d rjhouse_db -f <this file>

ALTER TABLE jeos_product_media
  ADD COLUMN IF NOT EXISTS seo_alt_text text;
