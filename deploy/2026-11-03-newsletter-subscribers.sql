-- Newsletter sign-ups from the storefront (idempotent).
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id             uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id      varchar NOT NULL,
  email          varchar(255) NOT NULL,
  source         varchar(50),
  status         varchar(20) NOT NULL DEFAULT 'subscribed',
  subscribed_at  timestamptz NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_newsletter_subscribers_tenant_email
  ON newsletter_subscribers (tenant_id, email);
