import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { CatalogMaster } from '../../database/entities/catalog-master.entity'

const TENANT = '00000000-0000-0000-0000-000000000001'

type Seed = { kind: string; code: string; name: string; sortOrder?: number; seoSlug?: string; synonyms?: string[]; metadata?: Record<string, any> }

const SEEDS: Seed[] = [
  // Diamond shapes
  { kind: 'diamond_shape', code: 'RND', name: 'Round Brilliant', sortOrder: 1, seoSlug: 'round', synonyms: ['Round Cut', 'Brilliant'] },
  { kind: 'diamond_shape', code: 'OVL', name: 'Oval', sortOrder: 2, seoSlug: 'oval', synonyms: ['Oval Cut'] },
  { kind: 'diamond_shape', code: 'PRI', name: 'Princess', sortOrder: 3, seoSlug: 'princess', synonyms: ['Princess Cut'] },
  { kind: 'diamond_shape', code: 'EMR', name: 'Emerald', sortOrder: 4, seoSlug: 'emerald', synonyms: ['Emerald Cut'] },
  { kind: 'diamond_shape', code: 'CUS', name: 'Cushion', sortOrder: 5, seoSlug: 'cushion', synonyms: ['Cushion Cut'] },
  { kind: 'diamond_shape', code: 'PEA', name: 'Pear', sortOrder: 6, seoSlug: 'pear', synonyms: ['Pear Cut', 'Teardrop'] },
  { kind: 'diamond_shape', code: 'MAR', name: 'Marquise', sortOrder: 7, seoSlug: 'marquise', synonyms: ['Marquise Cut'] },
  { kind: 'diamond_shape', code: 'RAD', name: 'Radiant', sortOrder: 8, seoSlug: 'radiant', synonyms: ['Radiant Cut'] },
  { kind: 'diamond_shape', code: 'ASC', name: 'Asscher', sortOrder: 9, seoSlug: 'asscher', synonyms: ['Asscher Cut'] },
  { kind: 'diamond_shape', code: 'HRT', name: 'Heart', sortOrder: 10, seoSlug: 'heart', synonyms: ['Heart Cut'] },
  // Product types (ERP "Select Producttype" dropdown)
  { kind: 'product_type', code: 'DIAMOND', name: 'Diamond Jewellery', sortOrder: 1 },
  { kind: 'product_type', code: 'GOLD', name: 'Gold Jewellery', sortOrder: 2 },
  { kind: 'product_type', code: 'SILVER', name: 'Silver Jewellery', sortOrder: 3 },
  { kind: 'product_type', code: 'PLATINUM', name: 'Platinum Jewellery', sortOrder: 4 },
  // Metal types
  { kind: 'metal_type', code: 'GOLD', name: 'Gold', sortOrder: 1 },
  { kind: 'metal_type', code: 'SILVER', name: 'Silver', sortOrder: 2 },
  { kind: 'metal_type', code: 'PLATINUM', name: 'Platinum', sortOrder: 3 },
  // Metal purities (metadata.applicableMetals drives the configurator).
  // metadata.pricingFactor drives DERIVED gold pricing: admin enters only the
  // 24K rate; each karat prices at 24K × pricingFactor / 99.9
  // (18K = ×78/99.9, 14K = ×60/99.9, 10K = ×43/99.9).
  { kind: 'metal_purity', code: '24K', name: '24K', sortOrder: 1, metadata: { applicableMetals: ['GOLD'], pricingFactor: 99.9 } },
  { kind: 'metal_purity', code: '22K', name: '22K', sortOrder: 2, metadata: { applicableMetals: ['GOLD'], pricingFactor: 91.6 } },
  { kind: 'metal_purity', code: '18K', name: '18K', sortOrder: 3, metadata: { applicableMetals: ['GOLD'], pricingFactor: 78 } },
  { kind: 'metal_purity', code: '14K', name: '14K', sortOrder: 4, metadata: { applicableMetals: ['GOLD'], pricingFactor: 60 } },
  { kind: 'metal_purity', code: '10K', name: '10K', sortOrder: 5, metadata: { applicableMetals: ['GOLD'], pricingFactor: 43 } },
  { kind: 'metal_purity', code: '999', name: '999 (Fine Silver)', sortOrder: 6, metadata: { applicableMetals: ['SILVER'] } },
  { kind: 'metal_purity', code: '925', name: '925 (Sterling)', sortOrder: 7, metadata: { applicableMetals: ['SILVER'] } },
  { kind: 'metal_purity', code: '800', name: '800', sortOrder: 8, metadata: { applicableMetals: ['SILVER'] } },
  { kind: 'metal_purity', code: '950', name: '950 Platinum', sortOrder: 9, metadata: { applicableMetals: ['PLATINUM'] } },
  { kind: 'metal_purity', code: '900', name: '900 Platinum', sortOrder: 10, metadata: { applicableMetals: ['PLATINUM'] } },
  // Metal colors (metadata.hex + applicableMetals)
  { kind: 'metal_color', code: 'WHITE', name: 'White', sortOrder: 1, metadata: { hex: '#E8E8E8', applicableMetals: ['GOLD'] } },
  { kind: 'metal_color', code: 'YELLOW', name: 'Yellow', sortOrder: 2, metadata: { hex: '#E6C200', applicableMetals: ['GOLD'] } },
  { kind: 'metal_color', code: 'ROSE', name: 'Rose', sortOrder: 3, metadata: { hex: '#E0A899', applicableMetals: ['GOLD'] } },
  { kind: 'metal_color', code: 'SILVER', name: 'Silver', sortOrder: 4, metadata: { hex: '#C0C0C0', applicableMetals: ['SILVER'] } },
  { kind: 'metal_color', code: 'PLATINUM', name: 'Platinum', sortOrder: 5, metadata: { hex: '#D6D6D6', applicableMetals: ['PLATINUM'] } },
  // Product badges (metadata.hex) — shown on storefront product cards + PDP.
  // A product can carry any number of these at once (Product.metadata.badges: string[]).
  { kind: 'product_badge', code: 'NEW', name: 'New', sortOrder: 1, metadata: { hex: '#162640' } },
  { kind: 'product_badge', code: 'BESTSELLER', name: 'Bestseller', sortOrder: 2, metadata: { hex: '#B8860B' } },
  { kind: 'product_badge', code: 'SALE', name: 'Sale', sortOrder: 3, metadata: { hex: '#B33A3A' } },
  { kind: 'product_badge', code: 'LIMITED_EDITION', name: 'Limited Edition', sortOrder: 4, metadata: { hex: '#5B3A8E' } },
  { kind: 'product_badge', code: 'EXCLUSIVE', name: 'Exclusive', sortOrder: 5, metadata: { hex: '#0F5C4C' } },
  // Diamond quality (clarity-led grades)
  { kind: 'diamond_quality', code: 'FL', name: 'FL (Flawless)', sortOrder: 1 },
  { kind: 'diamond_quality', code: 'IF', name: 'IF (Internally Flawless)', sortOrder: 2 },
  { kind: 'diamond_quality', code: 'VVS1', name: 'VVS1', sortOrder: 3 },
  { kind: 'diamond_quality', code: 'VVS2', name: 'VVS2', sortOrder: 4 },
  { kind: 'diamond_quality', code: 'VS1', name: 'VS1', sortOrder: 5 },
  { kind: 'diamond_quality', code: 'VS2', name: 'VS2', sortOrder: 6 },
  { kind: 'diamond_quality', code: 'SI1', name: 'SI1', sortOrder: 7 },
  { kind: 'diamond_quality', code: 'SI2', name: 'SI2', sortOrder: 8 },
  // Setting types
  { kind: 'setting_type', code: 'PRONG', name: 'Prong', sortOrder: 1 },
  { kind: 'setting_type', code: 'BEZEL', name: 'Bezel', sortOrder: 2 },
  { kind: 'setting_type', code: 'PAVE', name: 'Pavé', sortOrder: 3 },
  { kind: 'setting_type', code: 'CHANNEL', name: 'Channel', sortOrder: 4 },
  { kind: 'setting_type', code: 'HALO', name: 'Halo', sortOrder: 5 },
  { kind: 'setting_type', code: 'TENSION', name: 'Tension', sortOrder: 6 },
  // Categories (mirrors the old hardcoded CATEGORIES list in the product form)
  { kind: 'category', code: 'RINGS', name: 'Rings', sortOrder: 1 },
  { kind: 'category', code: 'NECKLACES', name: 'Necklaces', sortOrder: 2 },
  { kind: 'category', code: 'WEDDING_BANDS', name: 'Wedding Bands', sortOrder: 3 },
  { kind: 'category', code: 'BRACELETS', name: 'Bracelets', sortOrder: 4 },
  { kind: 'category', code: 'EARRINGS', name: 'Earrings', sortOrder: 5 },
  { kind: 'category', code: 'PENDANTS', name: 'Pendants', sortOrder: 6 },
  { kind: 'category', code: 'BANGLES', name: 'Bangles', sortOrder: 7 },
  // Style (backs both the "Sub Category / Style" and "Style" product-form fields)
  { kind: 'style', code: 'SOLITAIRE', name: 'Solitaire', sortOrder: 1 },
  { kind: 'style', code: 'HALO', name: 'Halo', sortOrder: 2 },
  { kind: 'style', code: 'HIDDEN_HALO', name: 'Hidden Halo', sortOrder: 3 },
  { kind: 'style', code: 'VINTAGE_HALO', name: 'Vintage Halo', sortOrder: 4 },
  { kind: 'style', code: 'THREE_STONE', name: 'Three Stone', sortOrder: 5 },
  { kind: 'style', code: 'TWO_STONE', name: 'Two Stone', sortOrder: 6 },
  { kind: 'style', code: 'SIDE_STONE', name: 'Side Stone', sortOrder: 7 },
  { kind: 'style', code: 'BEZEL', name: 'Bezel', sortOrder: 8 },
  { kind: 'style', code: 'PAVE', name: 'Pavé', sortOrder: 9 },
  { kind: 'style', code: 'BRIDAL_SETS', name: 'Bridal Sets', sortOrder: 10 },
  { kind: 'style', code: 'VINTAGE_ANTIQUE', name: 'Vintage & Antique', sortOrder: 11 },
  { kind: 'style', code: 'GEMSTONE', name: 'Gemstone', sortOrder: 12 },
  // Collection (marketing/tag field on each product — distinct from the
  // separate "Manage Collection" storefront feature, which has its own
  // name+slug+assigned-products records)
  { kind: 'collection', code: 'ENGAGEMENT', name: 'Engagement', sortOrder: 1 },
  { kind: 'collection', code: 'WEDDING', name: 'Wedding', sortOrder: 2 },
  { kind: 'collection', code: 'ANNIVERSARY', name: 'Anniversary', sortOrder: 3 },
  { kind: 'collection', code: 'PROPOSAL', name: 'Proposal', sortOrder: 4 },
  { kind: 'collection', code: 'BIRTHDAY_GIFT', name: 'Birthday Gift', sortOrder: 5 },
  { kind: 'collection', code: 'SPECIAL_MOMENT', name: 'Special Moment', sortOrder: 6 },
  { kind: 'collection', code: 'MINIMAL', name: 'Minimal', sortOrder: 7 },
  // Materials BOM "Component" column — jewelry-part naming
  { kind: 'component_type', code: 'CENTER_STONE', name: 'Center Stone', sortOrder: 1 },
  { kind: 'component_type', code: 'SIDE_STONE', name: 'Side Stone', sortOrder: 2 },
  { kind: 'component_type', code: 'SHANK', name: 'Shank', sortOrder: 3 },
  { kind: 'component_type', code: 'PRONG', name: 'Prong', sortOrder: 4 },
  { kind: 'component_type', code: 'HALO', name: 'Halo', sortOrder: 5 },
  { kind: 'component_type', code: 'BEZEL', name: 'Bezel', sortOrder: 6 },
  { kind: 'component_type', code: 'ACCENT', name: 'Accent', sortOrder: 7 },
  { kind: 'component_type', code: 'FINDING', name: 'Finding', sortOrder: 8 },
  // Materials BOM "Metal/Stone" column when materialType is Diamond/Stone
  { kind: 'stone_type', code: 'LAB_GROWN_DIAMOND', name: 'Lab Grown Diamond', sortOrder: 1 },
  { kind: 'stone_type', code: 'NATURAL_DIAMOND', name: 'Natural Diamond', sortOrder: 2 },
  { kind: 'stone_type', code: 'MOISSANITE', name: 'Moissanite', sortOrder: 3 },
  { kind: 'stone_type', code: 'CVD', name: 'CVD', sortOrder: 4 },
  { kind: 'stone_type', code: 'HPHT', name: 'HPHT', sortOrder: 5 },
  { kind: 'stone_type', code: 'RUBY', name: 'Ruby', sortOrder: 6 },
  { kind: 'stone_type', code: 'SAPPHIRE', name: 'Sapphire', sortOrder: 7 },
  { kind: 'stone_type', code: 'EMERALD', name: 'Emerald', sortOrder: 8 },
  // Materials BOM "Color" column when materialType is Diamond/Stone (GIA
  // colorless/near-colorless scale)
  { kind: 'diamond_color', code: 'D', name: 'D', sortOrder: 1 },
  { kind: 'diamond_color', code: 'E', name: 'E', sortOrder: 2 },
  { kind: 'diamond_color', code: 'F', name: 'F', sortOrder: 3 },
  { kind: 'diamond_color', code: 'G', name: 'G', sortOrder: 4 },
  { kind: 'diamond_color', code: 'H', name: 'H', sortOrder: 5 },
  { kind: 'diamond_color', code: 'I', name: 'I', sortOrder: 6 },
  { kind: 'diamond_color', code: 'J', name: 'J', sortOrder: 7 },
  { kind: 'diamond_color', code: 'K', name: 'K', sortOrder: 8 },
  { kind: 'diamond_color', code: 'L', name: 'L', sortOrder: 9 },
  { kind: 'diamond_color', code: 'M', name: 'M', sortOrder: 10 },
]

// Kinds introduced after the initial launch: on an already-provisioned tenant,
// seedDefaults() never re-runs its bulk-insert branch, so any kind added here
// also needs an entry below or it silently never appears outside a fresh DB.
const BACKFILL_KINDS = ['category', 'style', 'collection', 'component_type', 'stone_type', 'diamond_color', 'product_badge']

@Injectable()
export class CatalogSeeder {
  private readonly logger = new Logger('CatalogSeeder')
  constructor(
    @InjectRepository(CatalogMaster) private readonly repo: Repository<CatalogMaster>,
  ) {}

  async seedDefaults() {
    const count = await this.repo.count({ where: { tenantId: TENANT } })
    if (count > 0) {
      await this.ensurePricingDefaults()
      return
    }
    const rows = SEEDS.map((s) =>
      this.repo.create({
        tenantId: TENANT,
        kind: s.kind,
        code: s.code,
        name: s.name,
        sortOrder: s.sortOrder ?? 0,
        seoSlug: s.seoSlug,
        synonyms: s.synonyms || [],
        metadata: s.metadata || {},
        status: 'active',
      }),
    )
    await this.repo.save(rows)
    this.logger.log(`Seeded ${rows.length} catalog master values`)
  }

  // Idempotent upgrade for databases seeded BEFORE derived KT pricing existed:
  // adds the 10K purity and stamps pricingFactor on gold purities that lack it.
  // Runs on every boot; no-ops once applied. Admin edits to factors are kept.
  private async ensurePricingDefaults() {
    // product_type kind didn't exist in earlier installs — add missing rows.
    for (const seed of SEEDS.filter((x) => x.kind === 'product_type')) {
      const exists = await this.repo.findOne({
        where: { tenantId: TENANT, kind: 'product_type', code: seed.code },
      })
      if (!exists) {
        await this.repo.save(
          this.repo.create({
            tenantId: TENANT,
            kind: seed.kind,
            code: seed.code,
            name: seed.name,
            sortOrder: seed.sortOrder ?? 0,
            synonyms: [],
            metadata: {},
            status: 'active',
          }),
        )
        this.logger.log(`Added product_type ${seed.code}`)
      }
    }
    const goldPurities = SEEDS.filter(
      (s) => s.kind === 'metal_purity' && s.metadata?.pricingFactor != null,
    )
    for (const seed of goldPurities) {
      const row = await this.repo.findOne({
        where: { tenantId: TENANT, kind: 'metal_purity', code: seed.code },
      })
      if (!row) {
        await this.repo.save(
          this.repo.create({
            tenantId: TENANT,
            kind: seed.kind,
            code: seed.code,
            name: seed.name,
            sortOrder: seed.sortOrder ?? 0,
            synonyms: [],
            metadata: seed.metadata || {},
            status: 'active',
          }),
        )
        this.logger.log(`Added missing metal_purity ${seed.code}`)
      } else if (row.metadata?.pricingFactor == null) {
        row.metadata = { ...row.metadata, pricingFactor: seed.metadata!.pricingFactor }
        await this.repo.save(row)
        this.logger.log(`Stamped pricingFactor on metal_purity ${seed.code}`)
      }
    }

    // Any kind added to SEEDS after initial launch: insert rows missing on
    // this tenant. No-ops once applied; admin edits/additions are untouched.
    for (const seed of SEEDS.filter((s) => BACKFILL_KINDS.includes(s.kind))) {
      const exists = await this.repo.findOne({
        where: { tenantId: TENANT, kind: seed.kind, code: seed.code },
      })
      if (!exists) {
        await this.repo.save(
          this.repo.create({
            tenantId: TENANT,
            kind: seed.kind,
            code: seed.code,
            name: seed.name,
            sortOrder: seed.sortOrder ?? 0,
            synonyms: seed.synonyms || [],
            metadata: seed.metadata || {},
            status: 'active',
          }),
        )
        this.logger.log(`Added ${seed.kind} ${seed.code}`)
      }
    }
  }
}
