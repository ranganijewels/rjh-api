-- Seeds the 'blog_category' MasterCategory + a starter set of values.
-- Fixes: Blog Manager > Categories was calling /masters/values with the
-- wrong param names (already patched in code) AND had nothing to filter to,
-- since this category never existed at all.
DO $$
DECLARE
  v_tenant_id varchar := '00000000-0000-0000-0000-000000000001';
  v_category_id uuid;
BEGIN
  SELECT id INTO v_category_id
  FROM master_categories
  WHERE "tenantId" = v_tenant_id AND "categoryKey" = 'blog_category';

  IF v_category_id IS NULL THEN
    INSERT INTO master_categories
      (id, "tenantId", "categoryKey", "categoryLabel", description, "isSystem", "isActive", "sortOrder")
    VALUES
      (uuid_generate_v4(), v_tenant_id, 'blog_category', 'Blog Categories', 'Categories/tags shown on blog posts', false, true, 100)
    RETURNING id INTO v_category_id;
  END IF;

  INSERT INTO master_values
    (id, "tenantId", "categoryId", "valueKey", "valueLabel", "isActive", "sortOrder")
  SELECT uuid_generate_v4(), v_tenant_id, v_category_id, v.key, v.label, true, v.ord
  FROM (VALUES
    ('guides', 'Guides', 1),
    ('education', 'Education', 2),
    ('care', 'Care', 3),
    ('engagement', 'Engagement', 4),
    ('trends', 'Trends', 5),
    ('craftsmanship', 'Craftsmanship', 6)
  ) AS v(key, label, ord)
  WHERE NOT EXISTS (
    SELECT 1 FROM master_values mv
    WHERE mv."categoryId" = v_category_id AND mv."valueKey" = v.key
  );
END $$;
