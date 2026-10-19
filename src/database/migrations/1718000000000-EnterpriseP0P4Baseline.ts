import { MigrationInterface, QueryRunner } from 'typeorm'

/**
 * Enterprise P0–P4 baseline — creates the catalog/pricing/PIM/DAM/SEO/MES/after-sales
 * tables for a fresh PRODUCTION database (where synchronize is off). In dev these are
 * created automatically by synchronize. Generated from the dev schema via pg_dump;
 * the human-readable DDL also lives in enterprise_p0_p4_baseline.sql.
 */
export class EnterpriseP0P4Baseline1718000000000 implements MigrationInterface {
  name = 'EnterpriseP0P4Baseline1718000000000'

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`--
-- PostgreSQL database dump
--


-- Dumped from database version 16.14 (Homebrew)
-- Dumped by pg_dump version 16.14 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: jeos_accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.jeos_accounts (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    tenant_id character varying NOT NULL,
    type character varying DEFAULT 'b2c'::character varying NOT NULL,
    name character varying NOT NULL,
    contact_email character varying,
    contact_phone character varying,
    credit_terms character varying,
    credit_limit numeric(14,2),
    price_book_id character varying,
    parent_account_id character varying,
    currency_code character varying,
    country character varying,
    gst_number character varying,
    status character varying DEFAULT 'active'::character varying NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_by character varying,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: jeos_attribute_definitions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.jeos_attribute_definitions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    tenant_id character varying NOT NULL,
    code character varying NOT NULL,
    label character varying NOT NULL,
    type character varying DEFAULT 'text'::character varying NOT NULL,
    group_name character varying,
    is_localized boolean DEFAULT false NOT NULL,
    is_variant_axis boolean DEFAULT false NOT NULL,
    is_required boolean DEFAULT false NOT NULL,
    options jsonb DEFAULT '[]'::jsonb NOT NULL,
    validation jsonb DEFAULT '{}'::jsonb NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    status character varying DEFAULT 'active'::character varying NOT NULL,
    created_by character varying,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: jeos_attribute_values; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.jeos_attribute_values (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    tenant_id character varying NOT NULL,
    product_id character varying NOT NULL,
    attribute_id character varying NOT NULL,
    locale character varying DEFAULT 'en'::character varying NOT NULL,
    value text,
    created_by character varying,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: jeos_catalog_masters; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.jeos_catalog_masters (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    tenant_id character varying NOT NULL,
    kind character varying NOT NULL,
    code character varying NOT NULL,
    name character varying NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    synonyms jsonb DEFAULT '[]'::jsonb NOT NULL,
    seo_slug character varying,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    status character varying DEFAULT 'active'::character varying NOT NULL,
    created_by character varying,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: jeos_dam_assets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.jeos_dam_assets (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    tenant_id character varying NOT NULL,
    type character varying DEFAULT 'image'::character varying NOT NULL,
    file_name character varying NOT NULL,
    url text,
    storage_key character varying,
    parsed_tokens jsonb DEFAULT '{}'::jsonb NOT NULL,
    ai_tags jsonb DEFAULT '[]'::jsonb NOT NULL,
    bytes numeric(14,2),
    hash character varying,
    status character varying DEFAULT 'active'::character varying NOT NULL,
    created_by character varying,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: jeos_domain_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.jeos_domain_events (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    tenant_id character varying NOT NULL,
    aggregate_type character varying NOT NULL,
    aggregate_id character varying NOT NULL,
    event_type character varying NOT NULL,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    status character varying DEFAULT 'pending'::character varying NOT NULL,
    processed_at timestamp with time zone,
    source text,
    created_by character varying,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: jeos_price_books; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.jeos_price_books (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    tenant_id character varying NOT NULL,
    code character varying NOT NULL,
    name character varying NOT NULL,
    channel character varying DEFAULT 'retail'::character varying NOT NULL,
    customer_type character varying,
    country character varying,
    currency_code character varying,
    margin_percent numeric(8,3),
    markup_percent numeric(8,3) DEFAULT '0'::numeric NOT NULL,
    discount_percent numeric(8,3) DEFAULT '0'::numeric NOT NULL,
    priority integer DEFAULT 0 NOT NULL,
    status character varying DEFAULT 'active'::character varying NOT NULL,
    created_by character varying,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: jeos_product_asset_bindings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.jeos_product_asset_bindings (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    tenant_id character varying NOT NULL,
    asset_id character varying NOT NULL,
    bind_level character varying DEFAULT 'master'::character varying NOT NULL,
    ref_id character varying NOT NULL,
    metal_color character varying,
    view_code character varying,
    sort_order integer DEFAULT 0 NOT NULL,
    is_primary boolean DEFAULT false NOT NULL,
    created_by character varying,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: jeos_product_boms; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.jeos_product_boms (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    tenant_id character varying NOT NULL,
    family_id character varying,
    master_code character varying,
    rev_no integer DEFAULT 1 NOT NULL,
    status character varying DEFAULT 'draft'::character varying NOT NULL,
    weight_curve jsonb DEFAULT '{}'::jsonb NOT NULL,
    ring_size_delta_per_size numeric(8,3) DEFAULT '0'::numeric NOT NULL,
    base_ring_size numeric(5,1) DEFAULT '6'::numeric NOT NULL,
    metal_loss_pct numeric(6,3) DEFAULT '0'::numeric NOT NULL,
    labor_minutes numeric(8,2) DEFAULT '0'::numeric NOT NULL,
    components jsonb DEFAULT '[]'::jsonb NOT NULL,
    cad_version character varying,
    mold_version character varying,
    casting_info jsonb,
    manufacturing_notes text,
    change_log text,
    effective_date timestamp with time zone,
    approved_by character varying,
    approved_at timestamp with time zone,
    created_by character varying,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: jeos_product_families; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.jeos_product_families (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    tenant_id character varying NOT NULL,
    family_code character varying,
    name character varying NOT NULL,
    category character varying,
    default_shape character varying,
    default_metal_type character varying,
    story_md text,
    axes jsonb DEFAULT '[]'::jsonb NOT NULL,
    master_products jsonb DEFAULT '[]'::jsonb NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    status character varying DEFAULT 'draft'::character varying NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    created_by character varying,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: jeos_production_job_steps; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.jeos_production_job_steps (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    tenant_id character varying NOT NULL,
    production_order_id character varying NOT NULL,
    work_center_id character varying,
    work_center_code character varying,
    step_no integer NOT NULL,
    status character varying DEFAULT 'pending'::character varying NOT NULL,
    assigned_to character varying,
    started_at timestamp with time zone,
    finished_at timestamp with time zone,
    qc_result character varying,
    scrap_qty integer DEFAULT 0 NOT NULL,
    photo_asset_ids jsonb DEFAULT '[]'::jsonb NOT NULL,
    notes text,
    created_by character varying,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: jeos_production_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.jeos_production_orders (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    tenant_id character varying NOT NULL,
    order_no character varying,
    source character varying DEFAULT 'sales'::character varying NOT NULL,
    order_id character varying,
    product_id character varying,
    product_code character varying,
    variant_code character varying,
    qty integer DEFAULT 1 NOT NULL,
    priority character varying DEFAULT 'normal'::character varying NOT NULL,
    due_date date,
    status character varying DEFAULT 'created'::character varying NOT NULL,
    current_step integer DEFAULT 0 NOT NULL,
    created_by character varying,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: jeos_quotes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.jeos_quotes (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    tenant_id character varying NOT NULL,
    quote_number character varying,
    account_id character varying,
    customer_name character varying,
    customer_email character varying,
    status character varying DEFAULT 'draft'::character varying NOT NULL,
    lines jsonb DEFAULT '[]'::jsonb NOT NULL,
    subtotal numeric(14,2),
    discount numeric(14,2),
    total numeric(14,2),
    currency_code character varying,
    valid_until timestamp with time zone,
    notes text,
    price_book_id character varying,
    created_by character varying,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: jeos_return_rmas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.jeos_return_rmas (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    tenant_id character varying NOT NULL,
    rma_number character varying,
    order_id character varying,
    order_number character varying,
    reason text,
    type character varying DEFAULT 'return'::character varying NOT NULL,
    status character varying DEFAULT 'requested'::character varying NOT NULL,
    refund_amount numeric(14,2),
    created_by character varying,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: jeos_reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.jeos_reviews (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    tenant_id character varying NOT NULL,
    product_id character varying NOT NULL,
    customer_name character varying,
    email character varying,
    rating integer DEFAULT 5 NOT NULL,
    title character varying,
    body text,
    status character varying DEFAULT 'pending'::character varying NOT NULL,
    is_verified_purchase boolean DEFAULT false NOT NULL,
    created_by character varying,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: jeos_seo_pages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.jeos_seo_pages (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    tenant_id character varying NOT NULL,
    type character varying DEFAULT 'facet'::character varying NOT NULL,
    url_slug character varying NOT NULL,
    target character varying,
    target_ref character varying,
    meta_title character varying,
    meta_description text,
    h1 character varying,
    intro_md text,
    canonical_to character varying,
    indexable boolean DEFAULT true NOT NULL,
    priority numeric(3,2) DEFAULT 0.5 NOT NULL,
    lastmod timestamp with time zone,
    status character varying DEFAULT 'published'::character varying NOT NULL,
    created_by character varying,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: jeos_seo_redirects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.jeos_seo_redirects (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    tenant_id character varying NOT NULL,
    from_slug character varying NOT NULL,
    to_slug character varying NOT NULL,
    code integer DEFAULT 301 NOT NULL,
    created_by character varying,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: jeos_service_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.jeos_service_requests (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    tenant_id character varying NOT NULL,
    type character varying DEFAULT 'repair'::character varying NOT NULL,
    order_id character varying,
    customer_name character varying,
    customer_email character varying,
    product_code character varying,
    description text,
    status character varying DEFAULT 'open'::character varying NOT NULL,
    linked_production_order_id character varying,
    created_by character varying,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: jeos_warranty_registrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.jeos_warranty_registrations (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    tenant_id character varying NOT NULL,
    order_id character varying,
    order_number character varying,
    customer_id character varying,
    customer_name character varying,
    product_code character varying,
    terms character varying,
    registered_at timestamp with time zone,
    expires_at timestamp with time zone,
    status character varying DEFAULT 'active'::character varying NOT NULL,
    created_by character varying,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: jeos_work_centers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.jeos_work_centers (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    tenant_id character varying NOT NULL,
    code character varying NOT NULL,
    name character varying NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    std_minutes numeric(8,2) DEFAULT '0'::numeric NOT NULL,
    status character varying DEFAULT 'active'::character varying NOT NULL,
    created_by character varying,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: jeos_warranty_registrations PK_00b0d0cc09d68ccc1afd0bf82ed; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jeos_warranty_registrations
    ADD CONSTRAINT "PK_00b0d0cc09d68ccc1afd0bf82ed" PRIMARY KEY (id);


--
-- Name: jeos_return_rmas PK_0fbe623c4f17bc099eb26ca8f73; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jeos_return_rmas
    ADD CONSTRAINT "PK_0fbe623c4f17bc099eb26ca8f73" PRIMARY KEY (id);


--
-- Name: jeos_seo_pages PK_1adea80604eeb4cfd03e71a2e2f; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jeos_seo_pages
    ADD CONSTRAINT "PK_1adea80604eeb4cfd03e71a2e2f" PRIMARY KEY (id);


--
-- Name: jeos_catalog_masters PK_1c1a24494581147b42a58c60a9e; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jeos_catalog_masters
    ADD CONSTRAINT "PK_1c1a24494581147b42a58c60a9e" PRIMARY KEY (id);


--
-- Name: jeos_product_asset_bindings PK_2cca5013ca0c954938fca6d0577; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jeos_product_asset_bindings
    ADD CONSTRAINT "PK_2cca5013ca0c954938fca6d0577" PRIMARY KEY (id);


--
-- Name: jeos_attribute_values PK_39f1fdc118621d2ebe5444a3d85; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jeos_attribute_values
    ADD CONSTRAINT "PK_39f1fdc118621d2ebe5444a3d85" PRIMARY KEY (id);


--
-- Name: jeos_seo_redirects PK_489b3e4ec629e5e6edd8ba5e5d7; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jeos_seo_redirects
    ADD CONSTRAINT "PK_489b3e4ec629e5e6edd8ba5e5d7" PRIMARY KEY (id);


--
-- Name: jeos_work_centers PK_50f576a9de33bb2ad77396ae068; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jeos_work_centers
    ADD CONSTRAINT "PK_50f576a9de33bb2ad77396ae068" PRIMARY KEY (id);


--
-- Name: jeos_quotes PK_5a7deeed75407ff7b06ac7525ab; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jeos_quotes
    ADD CONSTRAINT "PK_5a7deeed75407ff7b06ac7525ab" PRIMARY KEY (id);


--
-- Name: jeos_product_families PK_5fe9a1662e7b31c47ca340564a9; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jeos_product_families
    ADD CONSTRAINT "PK_5fe9a1662e7b31c47ca340564a9" PRIMARY KEY (id);


--
-- Name: jeos_domain_events PK_6e2b8fbda8359ce989c1e1fb12b; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jeos_domain_events
    ADD CONSTRAINT "PK_6e2b8fbda8359ce989c1e1fb12b" PRIMARY KEY (id);


--
-- Name: jeos_dam_assets PK_800dcccb2ad88639d92a4cf2660; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jeos_dam_assets
    ADD CONSTRAINT "PK_800dcccb2ad88639d92a4cf2660" PRIMARY KEY (id);


--
-- Name: jeos_product_boms PK_849ec13480bf748c7e71153de67; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jeos_product_boms
    ADD CONSTRAINT "PK_849ec13480bf748c7e71153de67" PRIMARY KEY (id);


--
-- Name: jeos_service_requests PK_8f41661f424c8deee4b84fa55de; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jeos_service_requests
    ADD CONSTRAINT "PK_8f41661f424c8deee4b84fa55de" PRIMARY KEY (id);


--
-- Name: jeos_reviews PK_9b3f5d0eb1d3ea6a78f9a68d19f; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jeos_reviews
    ADD CONSTRAINT "PK_9b3f5d0eb1d3ea6a78f9a68d19f" PRIMARY KEY (id);


--
-- Name: jeos_attribute_definitions PK_9e3e18739253bb8c564f0c48d7b; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jeos_attribute_definitions
    ADD CONSTRAINT "PK_9e3e18739253bb8c564f0c48d7b" PRIMARY KEY (id);


--
-- Name: jeos_production_job_steps PK_c7ecdb8ff716a44f29ed9de8d3e; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jeos_production_job_steps
    ADD CONSTRAINT "PK_c7ecdb8ff716a44f29ed9de8d3e" PRIMARY KEY (id);


--
-- Name: jeos_accounts PK_c829c8f9423c5c165ef86ced534; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jeos_accounts
    ADD CONSTRAINT "PK_c829c8f9423c5c165ef86ced534" PRIMARY KEY (id);


--
-- Name: jeos_price_books PK_c8920964870d2f64134a6de8eb0; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jeos_price_books
    ADD CONSTRAINT "PK_c8920964870d2f64134a6de8eb0" PRIMARY KEY (id);


--
-- Name: jeos_production_orders PK_f7fd5d16b2ca7a70fcd4eff186c; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jeos_production_orders
    ADD CONSTRAINT "PK_f7fd5d16b2ca7a70fcd4eff186c" PRIMARY KEY (id);


--
-- Name: jeos_quotes UQ_55746c4c82125337d819d0f3bd9; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jeos_quotes
    ADD CONSTRAINT "UQ_55746c4c82125337d819d0f3bd9" UNIQUE (quote_number);


--
-- Name: jeos_production_orders UQ_c8e4bda1b387c9ed03ecc8d944a; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jeos_production_orders
    ADD CONSTRAINT "UQ_c8e4bda1b387c9ed03ecc8d944a" UNIQUE (order_no);


--
-- Name: IDX_00973630b2fe9079a45d8ea53f; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_00973630b2fe9079a45d8ea53f" ON public.jeos_accounts USING btree (tenant_id);


--
-- Name: IDX_05d74d7c0632248b63ebab66b6; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_05d74d7c0632248b63ebab66b6" ON public.jeos_price_books USING btree (tenant_id, customer_type, status);


--
-- Name: IDX_105ff2840de2cc3de03906e955; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_105ff2840de2cc3de03906e955" ON public.jeos_warranty_registrations USING btree (tenant_id);


--
-- Name: IDX_250af152703249cf961a8259d0; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_250af152703249cf961a8259d0" ON public.jeos_reviews USING btree (tenant_id);


--
-- Name: IDX_4ad6e1174482f3c0589e32ce91; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_4ad6e1174482f3c0589e32ce91" ON public.jeos_product_families USING btree (tenant_id, status);


--
-- Name: IDX_50d4568ca0c59cd02d84cdb7d6; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_50d4568ca0c59cd02d84cdb7d6" ON public.jeos_quotes USING btree (tenant_id, status);


--
-- Name: IDX_5188ee8ae3f3bd335470b524c9; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_5188ee8ae3f3bd335470b524c9" ON public.jeos_seo_pages USING btree (tenant_id);


--
-- Name: IDX_5b2c3f049cf2ce84d7c0ade8c7; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_5b2c3f049cf2ce84d7c0ade8c7" ON public.jeos_dam_assets USING btree (tenant_id, status);


--
-- Name: IDX_685d522762dd7dfd028cfb219a; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_685d522762dd7dfd028cfb219a" ON public.jeos_service_requests USING btree (tenant_id);


--
-- Name: IDX_69b9f497a923a6925e3b450e3d; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_69b9f497a923a6925e3b450e3d" ON public.jeos_catalog_masters USING btree (tenant_id, kind, code);


--
-- Name: IDX_788337a476a5cf6e0ac221fadf; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_788337a476a5cf6e0ac221fadf" ON public.jeos_catalog_masters USING btree (tenant_id, kind, status);


--
-- Name: IDX_79ef551e9b125535969222c231; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_79ef551e9b125535969222c231" ON public.jeos_return_rmas USING btree (tenant_id);


--
-- Name: IDX_7ea4399586a59198432c139623; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_7ea4399586a59198432c139623" ON public.jeos_attribute_values USING btree (product_id);


--
-- Name: IDX_8730e36ff3b160708fb621fb17; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_8730e36ff3b160708fb621fb17" ON public.jeos_accounts USING btree (tenant_id, type, status);


--
-- Name: IDX_873d11c3458ca113c5c7ae24cb; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_873d11c3458ca113c5c7ae24cb" ON public.jeos_product_asset_bindings USING btree (tenant_id, ref_id);


--
-- Name: IDX_8c6855774ad716a1427144cf18; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_8c6855774ad716a1427144cf18" ON public.jeos_production_job_steps USING btree (tenant_id);


--
-- Name: IDX_99f8a35d542328dd500751b6bb; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_99f8a35d542328dd500751b6bb" ON public.jeos_domain_events USING btree (tenant_id);


--
-- Name: IDX_a3bcb857f5f4ed04260462f6d2; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_a3bcb857f5f4ed04260462f6d2" ON public.jeos_attribute_definitions USING btree (tenant_id);


--
-- Name: IDX_a64b67779dfda7b8587e9cc66f; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_a64b67779dfda7b8587e9cc66f" ON public.jeos_price_books USING btree (tenant_id, status);


--
-- Name: IDX_a87ab8087b6cc098878242c1b2; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_a87ab8087b6cc098878242c1b2" ON public.jeos_seo_redirects USING btree (tenant_id);


--
-- Name: IDX_aa4f3bd8cc52f3df7a05098d2f; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_aa4f3bd8cc52f3df7a05098d2f" ON public.jeos_product_boms USING btree (tenant_id, master_code, status);


--
-- Name: IDX_b2962cbf8c622cc2119b39dba7; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_b2962cbf8c622cc2119b39dba7" ON public.jeos_production_orders USING btree (tenant_id);


--
-- Name: IDX_b964435a7f27774159e87c872e; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_b964435a7f27774159e87c872e" ON public.jeos_product_boms USING btree (tenant_id, family_id, status);


--
-- Name: IDX_c15d4d82c38aa44f1b5a59754b; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_c15d4d82c38aa44f1b5a59754b" ON public.jeos_product_asset_bindings USING btree (tenant_id);


--
-- Name: IDX_c5b00924493febff28ca0679ec; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_c5b00924493febff28ca0679ec" ON public.jeos_seo_redirects USING btree (tenant_id, from_slug);


--
-- Name: IDX_c6ca544aa29ec19e5dbc2c9ed5; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_c6ca544aa29ec19e5dbc2c9ed5" ON public.jeos_attribute_values USING btree (product_id, attribute_id, locale);


--
-- Name: IDX_cf07a5e543d8050cc2bce6a105; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_cf07a5e543d8050cc2bce6a105" ON public.jeos_work_centers USING btree (tenant_id);


--
-- Name: IDX_d94639bcfaaae5ab17f9e2939f; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_d94639bcfaaae5ab17f9e2939f" ON public.jeos_attribute_values USING btree (tenant_id);


--
-- Name: IDX_da048fd41154ebc2dd8bce794f; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_da048fd41154ebc2dd8bce794f" ON public.jeos_dam_assets USING btree (tenant_id);


--
-- Name: IDX_e014f57f410d6c7b3fd20fae96; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_e014f57f410d6c7b3fd20fae96" ON public.jeos_quotes USING btree (tenant_id);


--
-- Name: IDX_ff7425877481a72005ae691f30; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_ff7425877481a72005ae691f30" ON public.jeos_seo_pages USING btree (tenant_id, url_slug);


--
-- PostgreSQL database dump complete
--


`)
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE IF EXISTS "jeos_reviews" CASCADE`)
    await q.query(`DROP TABLE IF EXISTS "jeos_return_rmas" CASCADE`)
    await q.query(`DROP TABLE IF EXISTS "jeos_service_requests" CASCADE`)
    await q.query(`DROP TABLE IF EXISTS "jeos_warranty_registrations" CASCADE`)
    await q.query(`DROP TABLE IF EXISTS "jeos_production_job_steps" CASCADE`)
    await q.query(`DROP TABLE IF EXISTS "jeos_production_orders" CASCADE`)
    await q.query(`DROP TABLE IF EXISTS "jeos_work_centers" CASCADE`)
    await q.query(`DROP TABLE IF EXISTS "jeos_seo_redirects" CASCADE`)
    await q.query(`DROP TABLE IF EXISTS "jeos_seo_pages" CASCADE`)
    await q.query(`DROP TABLE IF EXISTS "jeos_product_asset_bindings" CASCADE`)
    await q.query(`DROP TABLE IF EXISTS "jeos_dam_assets" CASCADE`)
    await q.query(`DROP TABLE IF EXISTS "jeos_attribute_values" CASCADE`)
    await q.query(`DROP TABLE IF EXISTS "jeos_attribute_definitions" CASCADE`)
    await q.query(`DROP TABLE IF EXISTS "jeos_quotes" CASCADE`)
    await q.query(`DROP TABLE IF EXISTS "jeos_accounts" CASCADE`)
    await q.query(`DROP TABLE IF EXISTS "jeos_domain_events" CASCADE`)
    await q.query(`DROP TABLE IF EXISTS "jeos_price_books" CASCADE`)
    await q.query(`DROP TABLE IF EXISTS "jeos_product_boms" CASCADE`)
    await q.query(`DROP TABLE IF EXISTS "jeos_product_families" CASCADE`)
    await q.query(`DROP TABLE IF EXISTS "jeos_catalog_masters" CASCADE`)
  }
}
